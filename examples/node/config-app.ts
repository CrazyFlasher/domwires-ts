import {Factory, IFactory, LogLevel, Logger} from "domwires";
import {createNodeConfigLoader} from "domwires/node";
import {AppConfig, ExampleApp} from "./ExampleApp";

/**
 * The core of the framework has no dependencies on node built-ins, so the node config loader
 * lives in a separate entry point: "domwires/node".
 */
async function bootstrap(): Promise<void>
{
    const factory: IFactory = new Factory(new Logger(LogLevel.INFO));

    factory.mapToValue("IFactory", factory);
    factory.mapToValue("AppConfigLoader", createNodeConfigLoader());

    const app: ExampleApp = factory.getInstance<ExampleApp>(ExampleApp);
    const config: AppConfig = await app.loadConfig("./dev.json");

    console.log("Config of the application:", config.name);
}

bootstrap();
