/** Active work only; completed failures are bounded until the next settle. */
export class TaskTracker
{
    public constructor(private readonly ignoreFailure: (error: unknown) => boolean = () => false) {}
    private readonly active = new Set<Promise<void>>();
    private failures: unknown[] = [];
    private omittedFailures = 0;
    private settling?: Promise<void>;

    public get size(): number { return this.active.size; }

    public track(task: Promise<void>): Promise<void>
    {
        this.active.add(task);
        task.then(() => this.active.delete(task), error => {
            this.active.delete(task);
            if (this.ignoreFailure(error)) return;
            if (this.failures.length < 32) this.failures.push(error);
            else this.omittedFailures++;
        });
        return task;
    }

    public settle(): Promise<void>
    {
        if (this.settling) return this.settling;
        const drain = async (): Promise<void> => {
            // Give synchronous failures their rejection handler before checking the error buffer.
            do { await Promise.allSettled(this.active); } while (this.active.size);
            const failures = this.failures;
            const omitted = this.omittedFailures;
            this.failures = [];
            this.omittedFailures = 0;
            if (failures.length) throw new AggregateError(failures,
                "Command execution failed" + (omitted ? " (additional failures: " + omitted + ")" : ""));
        };
        this.settling = drain().finally(() => { this.settling = undefined; });
        return this.settling;
    }
}
