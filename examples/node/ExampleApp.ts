import {AbstractApp} from "domwires";

export type AppConfig = {
    readonly name: string;
};

export class ExampleApp extends AbstractApp<AppConfig>
{
}
