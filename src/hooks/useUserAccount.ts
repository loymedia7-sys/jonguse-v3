import { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import {
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth, isFirebaseAuthenticated } from '../firebase';
import { UserAccountData, SubscriptionPlanId, TokenTransaction, ToolType } from '../types';
import { DEFAULT_INITIAL_TOKENS, SUBSCRIPTION_PLANS } from '../data/plans';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
    },
    operationType,
    path,
  };
  console.warn('Firestore sync fallback:', JSON.stringify(errInfo));
}

const LOCAL_ACCOUNT_KEY = 'jonguse_local_account_v1';
const LOCAL_TOKEN_LOGS_KEY = 'jonguse_local_token_logs_v1';

function loadLocalTokenLogs(): TokenTransaction[] {
  try {
    const raw = localStorage.getItem(LOCAL_TOKEN_LOGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function appendLocalTokenLog(tx: TokenTransaction): TokenTransaction[] {
  try {
    const existing = loadLocalTokenLogs();
    const updated = [tx, ...existing].slice(0, 50);
    localStorage.setItem(LOCAL_TOKEN_LOGS_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [tx];
  }
}

export function useUserAccount(firebaseUser: User | null) {
  const [account, setAccount] = useState<UserAccountData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [tokenLogs, setTokenLogs] = useState<TokenTransaction[]>(() => loadLocalTokenLogs());

  // Initialize or synchronize user account document in Firestore or localStorage
  useEffect(() => {
    let unsubscribeSnapshot: (() => void) | null = null;

    async function syncAccount() {
      const canUseFirestore = Boolean(db && firebaseUser && isFirebaseAuthenticated(firebaseUser));

      if (!firebaseUser || !canUseFirestore) {
        // Local fallback when not logged in or when signed in with local creator session on custom domain
        const stored = localStorage.getItem(LOCAL_ACCOUNT_KEY);
        let parsed: UserAccountData | null = null;
        if (stored) {
          try {
            parsed = JSON.parse(stored);
          } catch {
            parsed = null;
          }
        }

        const mergedAccount: UserAccountData = {
          uid: firebaseUser?.uid || parsed?.uid || 'guest_local',
          email: firebaseUser?.email || parsed?.email || 'guest@jonguse.app',
          displayName: firebaseUser?.displayName || parsed?.displayName || 'Guest User',
          photoURL: firebaseUser?.photoURL || parsed?.photoURL || '',
          isAnonymous: firebaseUser ? Boolean(firebaseUser.isAnonymous) : true,
          plan: parsed?.plan || 'free',
          tokens: typeof parsed?.tokens === 'number' ? parsed.tokens : DEFAULT_INITIAL_TOKENS,
          totalTokensUsed: parsed?.totalTokensUsed || 0,
          operationsCount: parsed?.operationsCount || 0,
          planBillingCycle: parsed?.planBillingCycle || 'monthly',
          planExpiresAt: parsed?.planExpiresAt || undefined,
        };

        setAccount(mergedAccount);
        localStorage.setItem(LOCAL_ACCOUNT_KEY, JSON.stringify(mergedAccount));
        setTokenLogs(loadLocalTokenLogs());
        setLoading(false);
        return;
      }

      setLoading(true);

      if (db && firebaseUser) {
        const userRef = doc(db, 'users', firebaseUser.uid);

        try {
          // Listen in real-time to user's token balance & plan
          unsubscribeSnapshot = onSnapshot(
            userRef,
            async (snapshot) => {
              if (snapshot.exists()) {
                const data = snapshot.data();
                const userAcc: UserAccountData = {
                  uid: firebaseUser.uid,
                  email: firebaseUser.email || data.email || 'user@jonguse.app',
                  displayName: firebaseUser.displayName || data.displayName || 'Creator',
                  photoURL: firebaseUser.photoURL || data.photoURL || '',
                  isAnonymous: firebaseUser.isAnonymous,
                  plan: data.plan || 'free',
                  tokens: typeof data.tokens === 'number' ? data.tokens : DEFAULT_INITIAL_TOKENS,
                  totalTokensUsed: data.totalTokensUsed || 0,
                  operationsCount: data.operationsCount || 0,
                  planBillingCycle: data.planBillingCycle || 'monthly',
                  planExpiresAt: data.planExpiresAt || undefined,
                };
                setAccount(userAcc);
                localStorage.setItem(LOCAL_ACCOUNT_KEY, JSON.stringify(userAcc));
                setLoading(false);
              } else {
                // First-time user creation: grant 100 free tokens!
                const newAcc: UserAccountData = {
                  uid: firebaseUser.uid,
                  email: firebaseUser.email || '',
                  displayName: firebaseUser.displayName || (firebaseUser.isAnonymous ? 'Guest User' : 'Creator'),
                  photoURL: firebaseUser.photoURL || '',
                  isAnonymous: firebaseUser.isAnonymous,
                  plan: 'free',
                  tokens: DEFAULT_INITIAL_TOKENS,
                  totalTokensUsed: 0,
                  operationsCount: 0,
                  createdAt: Date.now(),
                  lastActiveAt: Date.now(),
                };
                await setDoc(userRef, {
                  ...newAcc,
                  lastActiveAt: serverTimestamp(),
                });
                setAccount(newAcc);
                localStorage.setItem(LOCAL_ACCOUNT_KEY, JSON.stringify(newAcc));
                setLoading(false);
              }
            },
            (err) => {
              handleFirestoreError(err, OperationType.GET, `users/${firebaseUser.uid}`);
              setLoading(false);
            }
          );
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, `users/${firebaseUser.uid}`);
          setLoading(false);
        }
      }
    }

    syncAccount();

    return () => {
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
    };
  }, [firebaseUser]);

  // Load user's token transactions and usage history
  const fetchTokenLogs = useCallback(async (): Promise<TokenTransaction[]> => {
    const localList = loadLocalTokenLogs();
    if (!firebaseUser || !db || !isFirebaseAuthenticated(firebaseUser)) {
      setTokenLogs(localList);
      return localList;
    }
    try {
      let snapshot;
      try {
        const q = query(
          collection(db, 'usage_logs'),
          where('userId', '==', firebaseUser.uid),
          orderBy('timestamp', 'desc'),
          limit(50)
        );
        snapshot = await getDocs(q);
      } catch (compoundErr) {
        // Fallback if compound index (userId + timestamp) is not yet built in Firestore
        const fallbackQ = query(
          collection(db, 'usage_logs'),
          where('userId', '==', firebaseUser.uid),
          limit(50)
        );
        snapshot = await getDocs(fallbackQ);
      }

      const list: TokenTransaction[] = [];
      snapshot.forEach((d) => {
        const item = d.data();
        list.push({
          id: d.id,
          userId: item.userId || firebaseUser.uid,
          userEmail: item.userEmail || firebaseUser.email || '',
          tool: item.tool || '',
          title: item.title || '',
          tokensDeducted: item.tokensDeducted || 0,
          tokensRemaining: item.tokensRemaining || 0,
          timestamp: item.timestamp || Date.now(),
          summary: item.summary || '',
          status: item.status || 'success',
        });
      });

      // Sort descending by timestamp in memory
      list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

      const finalLogs = list.length > 0 ? list : localList;
      setTokenLogs(finalLogs);
      return finalLogs;
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'usage_logs');
      setTokenLogs(localList);
      return localList;
    }
  }, [firebaseUser]);

  useEffect(() => {
    fetchTokenLogs();
  }, [firebaseUser, fetchTokenLogs]);

  // Check if current balance has enough tokens
  const hasEnoughTokens = useCallback(
    (cost: number): boolean => {
      if (!account) return false;
      return account.tokens >= cost;
    },
    [account]
  );

  // Deduct tokens when an AI action is executed
  const deductTokens = useCallback(
    async (
      cost: number,
      tool: ToolType | string,
      title: string,
      summary?: string
    ): Promise<{ success: boolean; remaining: number; reason?: string }> => {
      if (!account) {
        return { success: false, remaining: 0, reason: 'no_account' };
      }

      if (account.tokens < cost) {
        return { success: false, remaining: account.tokens, reason: 'insufficient_tokens' };
      }

      const newBalance = Math.max(0, account.tokens - cost);
      const newTotalUsed = (account.totalTokensUsed || 0) + cost;
      const newOpCount = (account.operationsCount || 0) + 1;

      // Optimistic local update
      const updatedAccount: UserAccountData = {
        ...account,
        tokens: newBalance,
        totalTokensUsed: newTotalUsed,
        operationsCount: newOpCount,
      };
      setAccount(updatedAccount);
      localStorage.setItem(LOCAL_ACCOUNT_KEY, JSON.stringify(updatedAccount));

      const localTx: TokenTransaction = {
        id: 'tx_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        userId: firebaseUser?.uid || account.uid || 'guest_local',
        userEmail: firebaseUser?.email || account.email || '',
        tool,
        title,
        tokensDeducted: cost,
        tokensRemaining: newBalance,
        summary: summary || '',
        timestamp: Date.now(),
        status: 'success',
      };
      setTokenLogs(appendLocalTokenLog(localTx));

      // Persist to Firestore if user authenticated with Firebase Auth
      if (firebaseUser && db && isFirebaseAuthenticated(firebaseUser)) {
        try {
          const userRef = doc(db, 'users', firebaseUser.uid);
          await updateDoc(userRef, {
            tokens: newBalance,
            totalTokensUsed: newTotalUsed,
            operationsCount: newOpCount,
            lastActiveAt: serverTimestamp(),
          });

          // Log detailed usage with user email and tokens
          await addDoc(collection(db, 'usage_logs'), {
            userId: firebaseUser.uid,
            userEmail: firebaseUser.email || account.email || '',
            tool,
            title,
            tokensDeducted: cost,
            tokensRemaining: newBalance,
            summary: summary || '',
            timestamp: Date.now(),
            status: 'success',
          });
        } catch (e) {
          handleFirestoreError(e, OperationType.UPDATE, `users/${firebaseUser.uid}`);
        }
      }

      return { success: true, remaining: newBalance };
    },
    [account, firebaseUser]
  );

  // Subscribe to a plan and credit plan tokens
  const subscribeToPlan = useCallback(
    async (
      planId: SubscriptionPlanId,
      billingCycle: 'monthly' | 'yearly',
      paymentMethod: string
    ): Promise<void> => {
      const selectedPlan = SUBSCRIPTION_PLANS.find((p) => p.id === planId) || SUBSCRIPTION_PLANS[1];
      const tokensToAdd = selectedPlan.tokensPerMonth;
      const currentTokens = account ? account.tokens : 0;
      const newBalance = currentTokens + tokensToAdd;
      const planExpiresAt = Date.now() + (billingCycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000;

      const updatedAccount: UserAccountData = {
        ...(account || {
          uid: firebaseUser?.uid || 'guest_local',
          email: firebaseUser?.email || 'user@jonguse.app',
          displayName: firebaseUser?.displayName || 'Creator',
          isAnonymous: firebaseUser?.isAnonymous ?? true,
          totalTokensUsed: 0,
          operationsCount: 0,
        }),
        plan: planId,
        tokens: newBalance,
        planBillingCycle: billingCycle,
        planExpiresAt,
      };

      setAccount(updatedAccount);
      localStorage.setItem(LOCAL_ACCOUNT_KEY, JSON.stringify(updatedAccount));

      const localTx: TokenTransaction = {
        id: 'tx_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        userId: firebaseUser?.uid || updatedAccount.uid,
        userEmail: firebaseUser?.email || updatedAccount.email,
        tool: 'subscription',
        title: `Subscribed to ${selectedPlan.name} (${billingCycle})`,
        tokensDeducted: -tokensToAdd,
        tokensRemaining: newBalance,
        summary: `Paid via ${paymentMethod.toUpperCase()} • Added +${tokensToAdd} Tokens`,
        timestamp: Date.now(),
        status: 'success',
      };
      setTokenLogs(appendLocalTokenLog(localTx));

      if (firebaseUser && db && isFirebaseAuthenticated(firebaseUser)) {
        try {
          const userRef = doc(db, 'users', firebaseUser.uid);
          await setDoc(
            userRef,
            {
              plan: planId,
              tokens: newBalance,
              planBillingCycle: billingCycle,
              planExpiresAt,
              lastActiveAt: serverTimestamp(),
            },
            { merge: true }
          );

          // Write subscription transaction log
          await addDoc(collection(db, 'usage_logs'), {
            userId: firebaseUser.uid,
            userEmail: firebaseUser.email || '',
            tool: 'subscription',
            title: `Subscribed to ${selectedPlan.name} (${billingCycle})`,
            tokensDeducted: -tokensToAdd, // negative means credited
            tokensRemaining: newBalance,
            summary: `Paid via ${paymentMethod.toUpperCase()} • Added +${tokensToAdd} Tokens`,
            timestamp: Date.now(),
            status: 'success',
          });
        } catch (e) {
          handleFirestoreError(e, OperationType.UPDATE, `users/${firebaseUser.uid}`);
        }
      }

      await fetchTokenLogs();
    },
    [account, firebaseUser, fetchTokenLogs]
  );

  // Refill tokens via a top-up pack
  const refillTokens = useCallback(
    async (tokensToAdd: number, amountUSD: number, paymentMethod: string): Promise<void> => {
      const currentTokens = account ? account.tokens : 0;
      const newBalance = currentTokens + tokensToAdd;

      const updatedAccount: UserAccountData = {
        ...(account || {
          uid: firebaseUser?.uid || 'guest_local',
          email: firebaseUser?.email || 'user@jonguse.app',
          displayName: firebaseUser?.displayName || 'Creator',
          isAnonymous: firebaseUser?.isAnonymous ?? true,
          totalTokensUsed: 0,
          operationsCount: 0,
          plan: 'free',
        }),
        tokens: newBalance,
      };

      setAccount(updatedAccount);
      localStorage.setItem(LOCAL_ACCOUNT_KEY, JSON.stringify(updatedAccount));

      const localTx: TokenTransaction = {
        id: 'tx_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        userId: firebaseUser?.uid || updatedAccount.uid,
        userEmail: firebaseUser?.email || updatedAccount.email,
        tool: 'topup',
        title: `Refilled +${tokensToAdd} Tokens`,
        tokensDeducted: -tokensToAdd,
        tokensRemaining: newBalance,
        summary: `Paid $${amountUSD} via ${paymentMethod.toUpperCase()}`,
        timestamp: Date.now(),
        status: 'success',
      };
      setTokenLogs(appendLocalTokenLog(localTx));

      if (firebaseUser && db && isFirebaseAuthenticated(firebaseUser)) {
        try {
          const userRef = doc(db, 'users', firebaseUser.uid);
          await updateDoc(userRef, {
            tokens: newBalance,
            lastActiveAt: serverTimestamp(),
          });

          await addDoc(collection(db, 'usage_logs'), {
            userId: firebaseUser.uid,
            userEmail: firebaseUser.email || '',
            tool: 'topup',
            title: `Refilled +${tokensToAdd} Tokens`,
            tokensDeducted: -tokensToAdd,
            tokensRemaining: newBalance,
            summary: `Paid $${amountUSD} via ${paymentMethod.toUpperCase()}`,
            timestamp: Date.now(),
            status: 'success',
          });
        } catch (e) {
          handleFirestoreError(e, OperationType.UPDATE, `users/${firebaseUser.uid}`);
        }
      }

      await fetchTokenLogs();
    },
    [account, firebaseUser, fetchTokenLogs]
  );

  return {
    account,
    loading,
    tokens: account?.tokens ?? DEFAULT_INITIAL_TOKENS,
    plan: account?.plan ?? 'free',
    hasEnoughTokens,
    deductTokens,
    subscribeToPlan,
    refillTokens,
    tokenLogs,
    fetchTokenLogs,
  };
}
