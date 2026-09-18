import {
    AbstractDisposable,
    AbstractHierarchyObject,
    inject,
    injectable,
    lazyInject,
    named,
    optional,
    postConstruct
} from "../../src";

export class DiService
{
    public readonly id: number = Math.random();
}

export class DiOtherService
{
}

@injectable()
export class DiConsumer extends AbstractDisposable
{
    @inject("string")
    public value!: string;

    @inject("string") @named("namedValue")
    public namedValue!: string;

    @inject("UnboundService") @optional()
    public optionalValue!: string;

    @inject(DiOtherService)
    public other!: DiOtherService;

    @lazyInject("string")
    public lazyValue!: string;

    public postConstructCalled = false;

    @postConstruct()
    private init(): void
    {
        this.postConstructCalled = true;
    }
}

export class DiBase extends AbstractHierarchyObject
{
    @inject("string")
    public baseValue!: string;
}

export class DiDerived extends DiBase
{
    @inject("string") @named("namedValue")
    public derivedValue!: string;
}
