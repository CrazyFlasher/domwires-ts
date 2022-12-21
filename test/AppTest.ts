import "reflect-metadata";
import {Suite} from "mocha";
import {expect} from "chai";
import {Factory, Logger, LogLevel} from "../src";
import {AbstractApp} from "../src/com/domwires/core/app/AbstractApp";

describe('AppTest', function (this: Suite)
{
    class MockApp extends AbstractApp<{ name: string; age: number }>
    {
    }

    it('testAppConfig', (done) =>
    {
        const f = new Factory(new Logger(LogLevel.VERBOSE));
        const app = f.getInstance<MockApp>(MockApp);

        app.loadConfig(success =>
        {
            try
            {
                expect(success).true;
                expect(app.appConfigJson.name).equals("Anton");
                expect(app.appConfigJson.age).equals(36);

                done();
            } catch (e)
            {
                console.error(e);
                throw e;
            }
        });
    });
});