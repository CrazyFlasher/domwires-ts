import "reflect-metadata";
import {Suite} from "mocha";
import {expect} from "chai";
import {AppFactory, IAppFactory} from "../src/com/domwires/core/factory/IAppFactory";
import {CommandMapperConfig, ICommandMapper} from "../src/com/domwires/core/mvc/command/ICommandMapper";
import {MockMessageType} from "./mock/MockMessageType";
import {
    MockCommand0,
    MockCommand1,
    MockCommand17,
    MockCommand18,
    MockCommand18NotLazy,
    MockCommand19,
    MockCommand19Ex,
    MockCommand2,
    MockCommand3,
    MockCommand4,
    MockCommand5,
    MockCommand8,
    MockVo,
    MockVo2
} from "./mock/MockCommands";
import {MockObj1} from "./mock/MockObjects";
import {MockAllowGuards, MockAllowGuards2, MockNotAllowGuards, MockValuesGuards} from "./mock/MockGuards";
import "../src/com/domwires/core/mvc/command/ICommandMapper";
import {Enum} from "../src/com/domwires/core/Enum";
import {MockModel2} from "./mock/MockModels";
import {Class, logger} from "../src/com/domwires/core/Global";
import {ICommand} from "../src/com/domwires/core/mvc/command/ICommand";

describe('CommandMapperTest', function (this: Suite)
{
    let factory: IAppFactory;
    let commandMapper: ICommandMapper;

    beforeEach(() =>
    {
        factory = new AppFactory();
        factory.mapToValue("IAppFactory", factory);

        commandMapper = factory.getInstance("ICommandMapper");
    });

    afterEach(() =>
    {
        factory.dispose();
        if (!commandMapper.isDisposed) commandMapper.dispose();
    });

    it('testUnmap', () =>
    {
        commandMapper.map(MockMessageType.GOODBYE, MockCommand1).addGuards(MockAllowGuards);
        commandMapper.unmap(MockMessageType.GOODBYE, MockCommand1);
        expect(commandMapper.hasMapping(MockMessageType.GOODBYE)).false;

        const m: MockObj1 = factory.getInstance(MockObj1);
        factory.mapToValue(MockObj1, m);

        commandMapper.tryToExecuteCommand(MockMessageType.GOODBYE);
        expect(m.d).equals(0);
    });

    it('testClear', () =>
    {
        commandMapper.map(MockMessageType.GOODBYE, MockCommand1);
        commandMapper.map(MockMessageType.HELLO, MockCommand1);
        commandMapper.map(MockMessageType.SHALOM, MockCommand1);

        commandMapper.clear();

        expect(commandMapper.hasMapping(MockMessageType.GOODBYE)).false;
        expect(commandMapper.hasMapping(MockMessageType.HELLO)).false;
        expect(commandMapper.hasMapping(MockMessageType.SHALOM)).false;
    });

    it('testDispose', () =>
    {
        commandMapper.map(MockMessageType.GOODBYE, MockCommand1);
        commandMapper.map(MockMessageType.HELLO, MockCommand1);
        commandMapper.map(MockMessageType.SHALOM, MockCommand1);

        commandMapper.dispose();

        expect(commandMapper.hasMapping(MockMessageType.GOODBYE)).false;
        expect(commandMapper.hasMapping(MockMessageType.HELLO)).false;
        expect(commandMapper.hasMapping(MockMessageType.SHALOM)).false;
    });

    it('testUnmapAll', () =>
    {
        commandMapper.map(MockMessageType.GOODBYE, MockCommand1);
        commandMapper.map(MockMessageType.HELLO, MockCommand1);
        commandMapper.map(MockMessageType.SHALOM, MockCommand1);
        commandMapper.unmapAll(MockMessageType.GOODBYE);
        commandMapper.unmapAll(MockMessageType.HELLO);
        commandMapper.unmapAll(MockMessageType.SHALOM);

        expect(commandMapper.hasMapping(MockMessageType.GOODBYE)).false;
        expect(commandMapper.hasMapping(MockMessageType.HELLO)).false;
        expect(commandMapper.hasMapping(MockMessageType.SHALOM)).false;
    });

    it('testMap', () =>
    {
        expect(commandMapper.hasMapping(MockMessageType.GOODBYE)).false;
        commandMapper.map(MockMessageType.GOODBYE, MockCommand1);
        expect(commandMapper.hasMapping(MockMessageType.GOODBYE)).true;
    });

    it('testTryToExecuteCommand', () =>
    {
        const m: MockObj1 = factory.getInstance(MockObj1);
        factory.mapToValue(MockObj1, m);

        commandMapper.map(MockMessageType.HELLO, MockCommand1);

        expect(m.d).equals(0);
        commandMapper.tryToExecuteCommand(MockMessageType.HELLO);
        expect(m.d).equals(7);
    });

    it('testManyEvents1Command', () =>
    {
        const m: MockObj1 = factory.getInstance(MockObj1);
        factory.mapToValue(MockObj1, m);

        commandMapper.map(MockMessageType.GOODBYE, MockCommand1);
        commandMapper.map(MockMessageType.HELLO, MockCommand1);
        commandMapper.map(MockMessageType.SHALOM, MockCommand1);
        commandMapper.tryToExecuteCommand(MockMessageType.GOODBYE);
        commandMapper.tryToExecuteCommand(MockMessageType.HELLO);
        commandMapper.tryToExecuteCommand(MockMessageType.SHALOM);
        expect(m.d).equals(21);

        commandMapper.unmap(MockMessageType.SHALOM, MockCommand1);
        commandMapper.tryToExecuteCommand(MockMessageType.GOODBYE);
        commandMapper.tryToExecuteCommand(MockMessageType.HELLO);
        commandMapper.tryToExecuteCommand(MockMessageType.SHALOM);
        expect(m.d).equals(35);
    });

    it('testRemapModel', () =>
    {
        const m: MockObj1 = factory.getInstance(MockObj1);
        factory.mapToValue(MockObj1, m);

        commandMapper.map(MockMessageType.GOODBYE, MockCommand1);
        commandMapper.tryToExecuteCommand(MockMessageType.GOODBYE);

        expect(m.d).equals(7);

        factory.unmapFromValue(MockObj1);

        const m2: MockObj1 = factory.getInstance(MockObj1);

        expect(m).not.equals(m2);

        factory.mapToValue(MockObj1, m2);

        commandMapper.tryToExecuteCommand(MockMessageType.GOODBYE);

        expect(m2.d).equals(7);
    });

    it('testInjectMessageData', () =>
    {
        commandMapper.map(MockMessageType.GOODBYE, MockCommand2);

        const vo: MockVo = new MockVo();
        const itemId: string = "lol";

        commandMapper.tryToExecuteCommand(MockMessageType.GOODBYE, {vo: vo, itemId: itemId, e: MockMessageType.HELLO});

        expect(vo.age).equals(11);
        expect(vo.name).equals("hi");
        expect(vo.str).equals("lol");
    });

    it('testMapOnce', () =>
    {
        const m: MockObj1 = factory.getInstance(MockObj1);
        factory.mapToValue(MockObj1, m);
        commandMapper.map(MockMessageType.GOODBYE, MockCommand1, null, true);
        commandMapper.tryToExecuteCommand(MockMessageType.GOODBYE);
        expect(commandMapper.hasMapping(MockMessageType.GOODBYE)).false;
    });

    it('testMapWithData', () =>
    {
        const m: MockObj1 = factory.getInstance(MockObj1);
        factory.mapToValue(MockObj1, m);
        commandMapper.map(MockMessageType.GOODBYE, MockCommand3, {olo: 5});
        commandMapper.tryToExecuteCommand(MockMessageType.GOODBYE);
        expect(m.d).equals(5);
    });

    it('testMapWithData2', () =>
    {
        commandMapper.setMergeMessageDataAndMappingData(true);

        const m: MockObj1 = factory.getInstance(MockObj1);
        factory.mapToValue(MockObj1, m);
        commandMapper.map(MockMessageType.GOODBYE, MockCommand3, {olo: 5});
        commandMapper.tryToExecuteCommand(MockMessageType.GOODBYE, {a: 1});
        expect(m.d).equals(5);
    });

    it('testMessageDataOverridesMappedData', () =>
    {
        const m: MockObj1 = factory.getInstance(MockObj1);
        factory.mapToValue(MockObj1, m);
        commandMapper.map(MockMessageType.GOODBYE, MockCommand3, {olo: 5});
        commandMapper.tryToExecuteCommand(MockMessageType.GOODBYE, {olo: 4});
        expect(m.d).equals(4);
    });

    it('testAllowGuards', () =>
    {
        const m: MockObj1 = factory.getInstance(MockObj1);
        factory.mapToValue(MockObj1, m);
        commandMapper.map(MockMessageType.GOODBYE, MockCommand3, {olo: 5}).addGuards(MockAllowGuards);
        commandMapper.tryToExecuteCommand(MockMessageType.GOODBYE, {olo: 4});
        expect(m.d).equals(4);
    });

    it('testAllowOppositeGuards', () =>
    {
        const m: MockObj1 = factory.getInstance(MockObj1);
        factory.mapToValue(MockObj1, m);
        commandMapper.map(MockMessageType.GOODBYE, MockCommand3, {
            olo: 5
        }).addGuardsNot(MockNotAllowGuards);
        commandMapper.tryToExecuteCommand(MockMessageType.GOODBYE, {olo: 4});
        expect(m.d).equals(4);
    });

    it('testNotAllowGuards', () =>
    {
        const m: MockObj1 = factory.getInstance(MockObj1);
        factory.mapToValue(MockObj1, m);
        commandMapper.map(MockMessageType.GOODBYE, MockCommand3, {olo: 5}).addGuards(MockNotAllowGuards);
        commandMapper.tryToExecuteCommand(MockMessageType.GOODBYE, {olo: 4});
        expect(m.d).equals(0);
    });

    it('testNormalAndOppositeGuards', () =>
    {
        const m: MockObj1 = factory.getInstance(MockObj1);
        factory.mapToValue(MockObj1, m);

        commandMapper.map1(MockMessageType.GOODBYE, [MockCommand3], {olo: 5})
            .addGuards(MockAllowGuards)
            .addGuards(MockAllowGuards)
            .addGuardsNot(MockNotAllowGuards)
            .addGuardsNot(MockAllowGuards2);

        commandMapper.tryToExecuteCommand(MockMessageType.GOODBYE);
        expect(m.d).equals(0);
    });

    it('testNotAllowOppositeGuards', () =>
    {
        const m: MockObj1 = factory.getInstance(MockObj1);
        factory.mapToValue(MockObj1, m);
        commandMapper.map(MockMessageType.GOODBYE, MockCommand3, {olo: 5}).addGuardsNot(MockAllowGuards);
        commandMapper.tryToExecuteCommand(MockMessageType.GOODBYE, {olo: 4});
        expect(m.d).equals(0);
    });

    it('testInjectMessageDataToGuards', () =>
    {
        commandMapper.map(MockMessageType.GOODBYE, MockCommand0).addGuards(MockAllowGuards);
        commandMapper.tryToExecuteCommand(MockMessageType.GOODBYE, {olo: 4});
    });

    it('testMapValuesToGuards', () =>
    {
        commandMapper.map(MockMessageType.GOODBYE, MockCommand0).addGuards(MockValuesGuards);
        commandMapper.tryToExecuteCommand(MockMessageType.GOODBYE, {s: "123", n: 123, o: {a: "olo"}});
    });

    it('testMapWithDataUnmaps', () =>
    {
        const m: MockObj1 = factory.getInstance(MockObj1);
        factory.mapToValue(MockObj1, m);
        commandMapper.executeCommand(MockCommand4, {olo: "lol"});
        expect(m.s).equals("lol");
        commandMapper.executeCommand(MockCommand4, {olo: "puk"});
        expect(m.s).equals("puk");
    });

    it('testExecuteWithVoGettersAsData', () =>
    {
        // Expecting no errors
        const m: MockObj1 = factory.getInstance(MockObj1);
        factory.mapToValue(MockObj1, m);
        const vo: MockVo2 = new MockVo2();
        vo.olo = "test";
        commandMapper.executeCommand(MockCommand5, vo);
        expect(m.s).equals("test");
    });

    it('testStopOnExecute', () =>
    {
        const m: MockObj1 = factory.getInstance(MockObj1);
        factory.mapToValue(MockObj1, m);
        factory.mapToValue("string", "test", "olo");
        commandMapper.map(MockMessageType.GOODBYE, MockCommand4, null, false, true);
        commandMapper.map(MockMessageType.GOODBYE, MockCommand1);
        commandMapper.tryToExecuteCommand(MockMessageType.GOODBYE);
        expect(m.d).equals(0);
    });

    it('testStopOnExecuteWithBatchMapping', () =>
    {
        const m: MockObj1 = factory.getInstance(MockObj1);
        factory.mapToValue(MockObj1, m);
        factory.mapToValue("string", "test", "olo");
        commandMapper.map1(MockMessageType.GOODBYE, [MockCommand4, MockCommand1], null, false, true);
        commandMapper.tryToExecuteCommand(MockMessageType.GOODBYE);
        expect(m.d).equals(7);
    });

    it('testArray', () =>
    {
        const v: Array<string> = [];

        const mappingData: any = {v: v};
        commandMapper.executeCommand(MockCommand8, mappingData);
    });

    it('testMapEnumValue', () =>
    {
        const e: Enum = MockMessageType.HELLO;

        factory.mapToValue("Enum", e, "e");
        expect(e, factory.getInstance("Enum", "e"));

        commandMapper.executeCommand(MockCommand17, {e: MockMessageType.HELLO});
    });

    it('testMapEnumValueWithoutTypeSpecified', () =>
    {
        commandMapper.executeCommand(MockCommand18, {
            i: 7,
            f: 5.5,
            s: "Anton",
            b: true,
            e: MockMessageType.HELLO
        });
    });

    it('testCommandIsSingleton1', () =>
    {
        const model: MockModel2 = factory.getInstance(MockModel2);
        factory.mapToValue(MockModel2, model);

        commandMapper.executeCommand(MockCommand19);
        commandMapper.executeCommand(MockCommand19);
        commandMapper.executeCommand(MockCommand19);

        expect(model.testVar).equals(3);
    });

    it('testCommandIsSingleton2', () =>
    {
        factory.mapToType(MockCommand19, MockCommand19Ex);

        const model: MockModel2 = factory.getInstance(MockModel2);
        factory.mapToValue(MockModel2, model);

        commandMapper.executeCommand(MockCommand19);
        commandMapper.executeCommand(MockCommand19);
        commandMapper.executeCommand(MockCommand19);

        expect(model.testVar).equals(3);
    });

    it('testCommandIsSingleton3', () =>
    {
        factory.mapToType(MockCommand19, MockCommand19Ex);

        const model: MockModel2 = factory.getInstance(MockModel2);
        factory.mapToValue(MockModel2, model);

        commandMapper.executeCommand(MockCommand19);

        expect(model.testVar).equals(1);
    });

    it('testCommandIsNotSingleton', () =>
    {
        factory.mapToValue("CommandMapperConfig", {singletonCommands: false});
        const commandMapper: ICommandMapper = factory.instantiateValueUnmapped("ICommandMapper");

        const model: MockModel2 = factory.getInstance(MockModel2);
        factory.mapToValue(MockModel2, model);

        commandMapper.executeCommand(MockCommand19);
        commandMapper.executeCommand(MockCommand19);
        commandMapper.executeCommand(MockCommand19);

        expect(model.testVar).equals(1);
    });

    it('testSingletonCommandsAreFaster', () =>
    {
        function executeCommands(config: CommandMapperConfig, commandClass: Class<ICommand>): number
        {
            const timeStarted = new Date().getTime();

            const factory: IAppFactory = new AppFactory();
            factory.mapToValue("IAppFactory", factory);
            factory.mapToValue("CommandMapperConfig", config);

            const commandMapper: ICommandMapper = factory.instantiateValueUnmapped("ICommandMapper");

            for (let i = 0; i < 100000; i++)
            {
                commandMapper.executeCommand(commandClass, {
                    i: 7,
                    f: 5.5,
                    s: "Anton",
                    b: true,
                    e: MockMessageType.HELLO
                });
            }

            return new Date().getTime() - timeStarted;
        }

        const timePassedForSingletonCommands = executeCommands({singletonCommands: true}, MockCommand18);
        const timePassedForNotSingletonCommands = executeCommands({singletonCommands: false}, MockCommand18NotLazy);

        logger.info("Time passed for singleton commands: ", timePassedForSingletonCommands);
        logger.info("Time passed for NOT singleton commands: ", timePassedForNotSingletonCommands);

        expect(timePassedForNotSingletonCommands < timePassedForNotSingletonCommands);
    });
});