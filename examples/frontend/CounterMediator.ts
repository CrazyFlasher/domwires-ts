import {AbstractHierarchyObject, IMessage, inject, postConstruct} from "domwires";
import {AppMessage, CounterChangedData} from "./AppMessage";
import {ICounterModelImmutable} from "./CounterModel";

/**
 * A mediator knows nothing about commands: it renders the immutable model and dispatches messages,
 * that are mapped to commands in the context.
 */
export class CounterMediator extends AbstractHierarchyObject
{
    @inject("mountPoint")
    private mountPoint!: HTMLElement;

    @inject("ICounterModelImmutable")
    private model!: ICounterModelImmutable;

    private valueLabel!: HTMLElement;
    private increaseButton!: HTMLButtonElement;

    @postConstruct()
    private init(): void
    {
        this.valueLabel = document.createElement("strong");

        this.increaseButton = document.createElement("button");
        this.increaseButton.textContent = "+1";
        this.increaseButton.addEventListener("click", () =>
        {
            this.dispatchMessage(AppMessage.CHANGE_COUNTER, {delta: 1});
        });

        const resetButton: HTMLButtonElement = document.createElement("button");
        resetButton.textContent = "reset";
        resetButton.addEventListener("click", () =>
        {
            this.dispatchMessage(AppMessage.RESET_COUNTER);
        });

        this.mountPoint.append(this.increaseButton, resetButton, this.valueLabel);

        this.addMessageListener(AppMessage.COUNTER_CHANGED, this.onCounterChanged);

        this.render();
    }

    private onCounterChanged(message: IMessage, data?: CounterChangedData): void
    {
        this.render();
    }

    private render(): void
    {
        this.valueLabel.textContent = " " + this.model.value;
        this.increaseButton.disabled = this.model.value >= this.model.maxValue;
    }
}
