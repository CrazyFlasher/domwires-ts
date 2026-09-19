import {Factory, Logger, LogLevel} from "domwires";
import {CounterContext} from "./CounterContext";
import {MOUNT_POINT} from "./CounterMediator";

export function mountCounter(mountPoint: HTMLElement): CounterContext
{
    const factory = new Factory(new Logger(LogLevel.INFO));
    factory.mapToValue("IFactory", factory);
    factory.mapToValue(MOUNT_POINT, mountPoint);
    const context = factory.getInstance(CounterContext);
    context.defer(() => factory.dispose());
    return context;
}

const mountPoint = document.querySelector<HTMLElement>("#app") ?? document.body;
let context = mountCounter(mountPoint);
const remount = document.createElement("button");
remount.textContent = "Remount";
remount.addEventListener("click", async () =>
{
    await context.close();
    context = mountCounter(mountPoint);
});
document.body.append(remount);
