import {Factory, IFactory, Logger, LogLevel} from "domwires";
import {CounterContext} from "./context";

/**
 * The entry point: a factory holds all bindings, a context is created through it and stays alive
 * as long as the application lives.
 */
const factory: IFactory = new Factory(new Logger(LogLevel.INFO));

factory.mapToValue("IFactory", factory);
factory.mapToValue("mountPoint", document.querySelector<HTMLElement>("#app") ?? document.body);

factory.getInstance<CounterContext>(CounterContext);
