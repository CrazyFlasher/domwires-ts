import {AbstractHierarchyObject, IMessage, inject, postConstruct, ServiceToken, ResourceScope} from "domwires";
import {AppMessage, CounterChangedData} from "./AppMessage";
import {ICounterModelImmutable, COUNTER_MODEL_IMMUTABLE} from "./CounterModel";

/**
 * A mediator knows nothing about commands: it renders the immutable model and dispatches messages,
 * that are mapped to commands in the context.
 */
export const MOUNT_POINT = new ServiceToken<HTMLElement>("mountPoint");

export class CounterMediator extends AbstractHierarchyObject
{
    @inject(MOUNT_POINT)
    private mountPoint!: HTMLElement;

    @inject(COUNTER_MODEL_IMMUTABLE)
    private model!: ICounterModelImmutable;

    private readonly resources = new ResourceScope();

    private listen(button: HTMLButtonElement, callback: () => void): void
    {
        button.addEventListener("click", callback);
        this.resources.defer(() => button.removeEventListener("click", callback));
    }

    public override dispose(): void
    {
        this.resources.dispose();
        super.dispose();
    }

    private valueLabel!: HTMLElement;
    private increaseButton!: HTMLButtonElement;

    @postConstruct()
    private init(): void
    {
        this.valueLabel = document.createElement("strong");

        this.increaseButton = document.createElement("button");
        this.increaseButton.textContent = "+1";
        this.listen(this.increaseButton, () =>
        {
            this.dispatchMessage(AppMessage.CHANGE_COUNTER, {delta: 1});
        });

        const resetButton: HTMLButtonElement = document.createElement("button");
        resetButton.textContent = "reset";
        this.listen(resetButton, () =>
        {
            this.dispatchMessage(AppMessage.RESET_COUNTER);
        });

        this.mountPoint.append(this.increaseButton, resetButton, this.valueLabel);
        this.resources.defer(() =>
        {
            this.increaseButton.remove();
            resetButton.remove();
            this.valueLabel.remove();
        });

        this.addMessageListener(AppMessage.COUNTER_CHANGED, this.onCounterChanged);

        this.render();
    }

    private onCounterChanged(_message: IMessage, _data?: CounterChangedData): void
    {
        // the message is only a trigger here: the value is read from the immutable model
        this.render();
    }

    private render(): void
    {
        this.valueLabel.textContent = " " + this.model.value;
        this.increaseButton.disabled = this.model.value >= this.model.maxValue;
    }
}
