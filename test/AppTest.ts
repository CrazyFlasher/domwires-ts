import {Suite} from "mocha";
import {expect} from "chai";
import {AbstractApp, Factory, Logger, LogLevel} from "../src";
import {createNodeConfigLoader} from "../src/com/domwires/node/NodeConfigLoader";

describe('AppTest', function (this: Suite)
{
    class MockApp extends AbstractApp<{ name: string; age: number }>
    {
    }

    it('testAppConfig', async () =>
    {
        const f = new Factory(new Logger(LogLevel.VERBOSE));

        f.mapToValue("AppConfigLoader", createNodeConfigLoader());

        const app: MockApp = f.getInstance<MockApp>(MockApp);
        const config: {name: string; age: number} = await app.loadConfig("./dev.json");

        expect(config.name).equals("Anton");
        expect(config.age).equals(36);
        expect(app.appConfigJson).equals(config);
    });
});
