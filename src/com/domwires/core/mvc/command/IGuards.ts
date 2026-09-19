/** Synchronous precondition evaluated in the command invocation's dependency scope. */
export interface IGuards
{
    /**
     * Whether execution is allowed. Keep this check side-effect free; a false result skips the command.
     */
    get allows(): boolean;
}