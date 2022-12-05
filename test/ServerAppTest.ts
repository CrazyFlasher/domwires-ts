import "reflect-metadata";
import {Suite} from "mocha";
import {expect} from "chai";
import {Factory, Logger, LogLevel} from "../src";
import {AbstractServerApp} from "../src/com/domwires/core/app/AbstractServerApp";

describe('ServerAppTest', function (this: Suite)
{
    class MockApp extends AbstractServerApp<{ name: string; age: number }>
    {
        public get conf(): { name: string; age: number }
        {
            return this.appConfigJson;
        }
    }

    it('testAppConfig', async () =>
    {
        const f = new Factory(new Logger(LogLevel.VERBOSE));
        const app = f.getInstance<MockApp>(MockApp);

        await app.init();

        expect(app.conf.name).equals("Anton");
        expect(app.conf.age).equals(36);
    });
});