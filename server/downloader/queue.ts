type Task = () => Promise<void>;

export class DownloadQueue {
  private concurrency: number;
  private running: number = 0;
  private queue: Task[] = [];

  constructor(concurrency = 2) {
    this.concurrency = concurrency;
  }

  public enqueue(task: Task): void {
    this.queue.push(task);
    this.processNext();
  }

  private processNext(): void {
    if (this.running >= this.concurrency || this.queue.length === 0) {
      return;
    }

    const nextTask = this.queue.shift();
    if (!nextTask) return;

    this.running++;
    nextTask()
      .catch((err) => {
        console.error('Download queue task error:', err);
      })
      .finally(() => {
        this.running--;
        this.processNext();
      });
  }

  public get pendingCount(): number {
    return this.queue.length;
  }

  public get activeCount(): number {
    return this.running;
  }
}

export const globalDownloadQueue = new DownloadQueue(2);
