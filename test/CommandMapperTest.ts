import "reflect-metadata";
import {Done, Suite} from "mocha";
import {expect} from "chai";
import {Class, CommandMapperConfig, Enum, Factory, ICommand, ICommandMapper, IFactory, Logger, LogLevel} from "../src";
import {MockMessageType} from "./mock/MockMessageType";
import {
    MockAfterAsyncCommand,
    MockAsyncCommand,
    MockCommand0,
    MockCommand1,
    MockCommand17,
    MockCommand18,
    MockCommand18NotLazy,
    MockCommand19,
    MockCommand19Ex,
    MockCommand2,
    MockCommand24, MockCommand25,
    MockCommand2_1,
    MockCommand3,
    MockCommand4,
    MockCommand5,
    MockCommand8,
    MockNestedCmd, MockType,
    MockVo,
    MockVo2,
    MockVoWithId
} from "./mock/MockCommands";
import {MockObj1} from "./mock/IMockObject";
import {
    MockAllowGuards,
    MockAllowGuards2,
    MockNotAllowGuards,
    MockValuesGuards,
    MockValuesNotSingletonGuards
} from "./mock/MockGuards";
import "../src/com/domwires/core/mvc/command/ICommandMapper";
import {MockAsyncModel, MockModel1, MockModel2} from "./mock/MockModels";
import {MockContext10, MockContext11, MockContext9} from "./mock/MockContext";

describe('CommandMapperTest', function (this: Suite)
{
    let factory: IFactory;
    let commandMapper: ICommandMapper;
    const logger = new Logger(LogLevel.VERBOSE);

    beforeEach(() =>
    {
        factory = new Factory(logger);
        factory.mapToValue("IFactory", factory);

        commandMapper = factory.instantiateValueUnmapped("ICommandMapper");
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

        const m: MockObj1 = factory.instantiateValueUnmapped<MockObj1>(MockObj1);
        factory.mapToValue<MockObj1>(MockObj1, m);

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
        const m: MockObj1 = factory.getInstance<MockObj1>(MockObj1);
        factory.mapToValue<MockObj1>(MockObj1, m);

        commandMapper.map(MockMessageType.HELLO, MockCommand1);

        expect(m.d).equals(0);
        commandMapper.tryToExecuteCommand(MockMessageType.HELLO);
        expect(m.d).equals(7);
    });

    it('testManyEvents1Command', () =>
    {
        const m: MockObj1 = factory.getInstance<MockObj1>(MockObj1);
        factory.mapToValue<MockObj1>(MockObj1, m);

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
        const m: MockObj1 = factory.getInstance<MockObj1>(MockObj1);
        factory.mapToValue<MockObj1>(MockObj1, m);

        commandMapper.map(MockMessageType.GOODBYE, MockCommand1);
        commandMapper.tryToExecuteCommand(MockMessageType.GOODBYE);

        expect(m.d).equals(7);

        factory.unmapFromValue<MockObj1>(MockObj1);

        const m2: MockObj1 = factory.getInstance<MockObj1>(MockObj1);

        expect(m).not.equals(m2);

        factory.mapToValue<MockObj1>(MockObj1, m2);

        commandMapper.tryToExecuteCommand(MockMessageType.GOODBYE);

        expect(m2.d).equals(7);
    });

    it('testInjectMessageData', () =>
    {
        commandMapper.map(MockMessageType.GOODBYE, MockCommand2);

        const vo: MockVo = new MockVo();
        const itemId = "lol";

        commandMapper.tryToExecuteCommand(MockMessageType.GOODBYE, {vo, itemId, e: MockMessageType.HELLO});

        expect(vo.age).equals(11);
        expect(vo.name).equals("hi");
        expect(vo.str).equals("lol");
    });

    it('testInjectMessageDataFromType', () =>
    {
        commandMapper.map(MockMessageType.GOODBYE, MockCommand25);

        const vo: MockType = {name: "olo"};

        commandMapper.tryToExecuteCommand(MockMessageType.GOODBYE, {vo});

        expect(vo.name).equals("hi");
    });

    it('testInjectMessageDataWidthCustomConstructorName', () =>
    {
        commandMapper.map(MockMessageType.GOODBYE, MockCommand2_1);

        const vo: MockVoWithId = new MockVoWithId();
        const itemId = "lol";

        commandMapper.tryToExecuteCommand(MockMessageType.GOODBYE, {vo, itemId, e: MockMessageType.HELLO});

        expect(vo.age).equals(11);
        expect(vo.name).equals("hi");
        expect(vo.str).equals("lol");
    });

    it('testMapOnce', () =>
    {
        const m: MockObj1 = factory.getInstance<MockObj1>(MockObj1);
        factory.mapToValue<MockObj1>(MockObj1, m);
        commandMapper.map(MockMessageType.GOODBYE, MockCommand1, null, false, true);
        commandMapper.tryToExecuteCommand(MockMessageType.GOODBYE);
        expect(commandMapper.hasMapping(MockMessageType.GOODBYE)).false;
    });

    it('testMapWithData', () =>
    {
        const m: MockObj1 = factory.getInstance<MockObj1>(MockObj1);
        factory.mapToValue<MockObj1>(MockObj1, m);
        commandMapper.map(MockMessageType.GOODBYE, MockCommand3, {olo: 5});
        commandMapper.tryToExecuteCommand(MockMessageType.GOODBYE);
        expect(m.d).equals(5);
    });

    it('testMapWithData2', () =>
    {
        const m: MockObj1 = factory.getInstance<MockObj1>(MockObj1);
        factory.mapToValue<MockObj1>(MockObj1, m);
        commandMapper.map(MockMessageType.GOODBYE, MockCommand3, {olo: 5});
        commandMapper.tryToExecuteCommand(MockMessageType.GOODBYE, {a: 1});
        expect(m.d).equals(5);
    });

    it('testMessageDataOverridesMappedData', () =>
    {
        factory.mapToValue<CommandMapperConfig>("CommandMapperConfig",
            {singletonCommands: true, mergeMessageDataAndMappingData: false});

        const cm: ICommandMapper = factory.instantiateValueUnmapped("ICommandMapper");

        const m: MockObj1 = factory.getInstance<MockObj1>(MockObj1);
        factory.mapToValue<MockObj1>(MockObj1, m);
        cm.map(MockMessageType.GOODBYE, MockCommand3, {olo: 5});
        cm.tryToExecuteCommand(MockMessageType.GOODBYE, {olo: 4});
        expect(m.d).equals(4);
    });

    it('testAllowGuards', () =>
    {
        factory.mapToValue<CommandMapperConfig>("CommandMapperConfig",
            {singletonCommands: true, mergeMessageDataAndMappingData: false});

        const cm: ICommandMapper = factory.instantiateValueUnmapped("ICommandMapper");

        const m: MockObj1 = factory.getInstance<MockObj1>(MockObj1);
        factory.mapToValue<MockObj1>(MockObj1, m);
        cm.map(MockMessageType.GOODBYE, MockCommand3, {olo: 5}).addGuards(MockAllowGuards);
        cm.tryToExecuteCommand(MockMessageType.GOODBYE, {olo: 4});
        expect(m.d).equals(4);
    });

    it('testAllowOppositeGuards', () =>
    {
        factory.mapToValue<CommandMapperConfig>("CommandMapperConfig",
            {singletonCommands: true, mergeMessageDataAndMappingData: false});

        const cm: ICommandMapper = factory.instantiateValueUnmapped("ICommandMapper");

        const m: MockObj1 = factory.getInstance<MockObj1>(MockObj1);
        factory.mapToValue<MockObj1>(MockObj1, m);
        cm.map(MockMessageType.GOODBYE, MockCommand3, {
            olo: 5
        }).addGuardsNot(MockNotAllowGuards);
        cm.tryToExecuteCommand(MockMessageType.GOODBYE, {olo: 4});
        expect(m.d).equals(4);
    });

    it('testNotAllowGuards', () =>
    {
        const m: MockObj1 = factory.getInstance<MockObj1>(MockObj1);
        factory.mapToValue<MockObj1>(MockObj1, m);
        commandMapper.map(MockMessageType.GOODBYE, MockCommand3, {olo: 5}).addGuards(MockNotAllowGuards);
        commandMapper.tryToExecuteCommand(MockMessageType.GOODBYE, {olo: 4});
        expect(m.d).equals(0);
    });

    it('testNormalAndOppositeGuards', () =>
    {
        const m: MockObj1 = factory.getInstance<MockObj1>(MockObj1);
        factory.mapToValue<MockObj1>(MockObj1, m);

        commandMapper.map(MockMessageType.GOODBYE, [MockCommand3], {olo: 5})
            .addGuards(MockAllowGuards)
            .addGuards(MockAllowGuards)
            .addGuardsNot(MockNotAllowGuards)
            .addGuardsNot(MockAllowGuards2);

        commandMapper.tryToExecuteCommand(MockMessageType.GOODBYE);
        expect(m.d).equals(0);
    });

    it('testNotAllowOppositeGuards', () =>
    {
        const m: MockObj1 = factory.getInstance<MockObj1>(MockObj1);
        factory.mapToValue<MockObj1>(MockObj1, m);
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

    it('testMapValuesToGuardsNotSingleton', () =>
    {
        factory.mapToValue<CommandMapperConfig>("CommandMapperConfig",
            {singletonCommands: false, mergeMessageDataAndMappingData: true});
        const cm: ICommandMapper = factory.instantiateValueUnmapped("ICommandMapper");

        cm.map(MockMessageType.GOODBYE, MockCommand0).addGuards(MockValuesNotSingletonGuards);
        cm.tryToExecuteCommand(MockMessageType.GOODBYE, {s: "123", n: 123, o: {a: "olo"}});
    });

    it('testMapWithDataUnmaps', () =>
    {
        const m: MockObj1 = factory.getInstance<MockObj1>(MockObj1);
        factory.mapToValue<MockObj1>(MockObj1, m);
        commandMapper.executeCommand(MockCommand4, {olo: "lol"});
        expect(m.s).equals("lol");
        commandMapper.executeCommand(MockCommand4, {olo: "puk"});
        expect(m.s).equals("puk");
    });

    it('testExecuteWithVoGettersAsData', () =>
    {
        // Expecting no errors
        const m: MockObj1 = factory.getInstance<MockObj1>(MockObj1);
        factory.mapToValue<MockObj1>(MockObj1, m);
        const vo: MockVo2 = new MockVo2();
        vo.olo = "test";
        commandMapper.executeCommand(MockCommand5, vo);
        expect(m.s).equals("test");
    });

    it('testStopOnExecute', () =>
    {
        const m: MockObj1 = factory.getInstance<MockObj1>(MockObj1);
        factory.mapToValue<MockObj1>(MockObj1, m);
        factory.mapToValue("string", "test", "olo");
        commandMapper.map(MockMessageType.GOODBYE, MockCommand4, null, false, true);
        commandMapper.map(MockMessageType.GOODBYE, MockCommand1);
        commandMapper.tryToExecuteCommand(MockMessageType.GOODBYE);
        expect(m.d).equals(0);
    });

    it('testStopOnExecuteWithBatchMapping', () =>
    {
        const m: MockObj1 = factory.getInstance<MockObj1>(MockObj1);
        factory.mapToValue<MockObj1>(MockObj1, m);
        factory.mapToValue("string", "test", "olo");
        commandMapper.map(MockMessageType.GOODBYE, [MockCommand4, MockCommand1], null, true);
        commandMapper.tryToExecuteCommand(MockMessageType.GOODBYE);
        expect(m.d).equals(7);
    });

    it('testArray', () =>
    {
        const v: string[] = [];

        const mappingData = {v};
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
        const model: MockModel2 = factory.getInstance<MockModel2>(MockModel2);
        factory.mapToValue<MockModel2>(MockModel2, model);

        commandMapper.executeCommand(MockCommand19);
        commandMapper.executeCommand(MockCommand19);
        commandMapper.executeCommand(MockCommand19);

        expect(model.testVar).equals(3);
    });

    it('testCommandIsSingleton2', () =>
    {
        factory.mapToType<MockCommand19>(MockCommand19, MockCommand19Ex);

        const model: MockModel2 = factory.getInstance<MockModel2>(MockModel2);
        factory.mapToValue<MockModel2>(MockModel2, model);

        commandMapper.executeCommand(MockCommand19);
        commandMapper.executeCommand(MockCommand19);
        commandMapper.executeCommand(MockCommand19);

        expect(model.testVar).equals(3);
    });

    it('testCommandIsSingleton3', () =>
    {
        factory.mapToType<MockCommand19>(MockCommand19, MockCommand19Ex);

        const model: MockModel2 = factory.getInstance<MockModel2>(MockModel2);
        factory.mapToValue<MockModel2>(MockModel2, model);

        commandMapper.executeCommand(MockCommand19);

        expect(model.testVar).equals(1);
    });

    it('testCommandIsNotSingleton', () =>
    {
        factory.mapToValue<CommandMapperConfig>("CommandMapperConfig",
            {singletonCommands: false, mergeMessageDataAndMappingData: true});
        const cm: ICommandMapper = factory.instantiateValueUnmapped("ICommandMapper");

        const model: MockModel2 = factory.getInstance<MockModel2>(MockModel2);
        factory.mapToValue<MockModel2>(MockModel2, model);

        cm.executeCommand(MockCommand19);
        cm.executeCommand(MockCommand19);
        cm.executeCommand(MockCommand19);

        expect(model.testVar).equals(1);
    });

    it('testSingletonCommandsAreFaster', () =>
    {
        function executeCommands(config: CommandMapperConfig, commandClass: Class<ICommand>): number
        {
            const timeStarted = new Date().getTime();

            const f: IFactory = new Factory(new Logger(LogLevel.VERBOSE));
            f.mapToValue("IFactory", f);
            f.mapToValue("CommandMapperConfig", config);

            const cm: ICommandMapper = f.instantiateValueUnmapped("ICommandMapper");

            for (let i = 0; i < 1000; i++)
            {
                cm.executeCommand(commandClass, {
                    i: 7,
                    f: 5.5,
                    s: "Anton",
                    b: true,
                    e: MockMessageType.HELLO
                });
            }

            return new Date().getTime() - timeStarted;
        }

        const timePassedForSingletonCommands = executeCommands(
            {singletonCommands: true, mergeMessageDataAndMappingData: true}, MockCommand18);

        const timePassedForNotSingletonCommands = executeCommands(
            {singletonCommands: false, mergeMessageDataAndMappingData: true}, MockCommand18NotLazy);

        logger.info("Time passed for singleton commands: ", timePassedForSingletonCommands);
        logger.info("Time passed for NOT singleton commands: ", timePassedForNotSingletonCommands);

        expect(timePassedForNotSingletonCommands < timePassedForNotSingletonCommands);
    });


    it('testNoMultipleMappingsInLazyInjector', () =>
    {
        // Expecting no errors
        const obj = factory.getInstance<MockObj1>(MockObj1);
        factory.mapToValue<MockObj1>(MockObj1, obj);
        factory.mapToValue<ICommandMapper>("ICommandMapper", commandMapper);
        commandMapper.executeCommand(MockNestedCmd);

        expect(obj.d).equals(7);
    });

    it('testAsyncCommand', (done: Done) =>
    {
        const obj = factory.getInstance<MockAsyncModel>(MockAsyncModel);
        factory.mapToValue<MockAsyncModel>(MockAsyncModel, obj);

        commandMapper.map(MockMessageType.GOODBYE, [
            MockAsyncCommand, MockAfterAsyncCommand,
            MockAsyncCommand, MockAfterAsyncCommand
        ]);

        commandMapper.tryToExecuteCommand(MockMessageType.GOODBYE);

        setTimeout(() =>
        {
            logger.info("time passed:", obj.timePassed);
            expect(obj.timePassed).least(400);
            expect(obj.completeCount).equals(2);

            done();

        }, 600);
    });

    it('testCommandMappingValuesAndMessageValues', () =>
    {
        const c = factory.getInstance<MockContext9>(MockContext9);

        expect(c.vo1.value).equals(3);
        expect(c.vo2.value).equals(7);
    });

    it('testInjectMessageInitialTarget', () =>
    {
        const c = factory.getInstance<MockContext10>(MockContext10);
        expect(c.getTestModel().testVar).equals(5);
    });

    it('testTargetEqualsGuards', () =>
    {
        // Expecting no errors (check logs, because error in async won't crash app)

        MockCommand24.executedTimes = 0;

        const c = factory.getInstance<MockContext11>(MockContext11);
        const m1 = factory.getInstance<MockModel1>(MockModel1);
        const m2 = factory.getInstance<MockModel2>(MockModel2);

        c.addModel(m1).addModel(m2);

        c.map(MockMessageType.HELLO, MockCommand24).addTargetGuards(m2);

        m1.dispatchMessage(MockMessageType.HELLO);
        m2.dispatchMessage(MockMessageType.HELLO);

        expect(m2.testVar).equals(5);
        expect(MockCommand24.executedTimes).equals(1);
    });

    it('testTargetNotEqualGuards', () =>
    {
        // Expecting no errors (check logs, because error in async won't crash app)

        MockCommand24.executedTimes = 0;

        const c = factory.getInstance<MockContext11>(MockContext11);
        const m1 = factory.getInstance<MockModel1>(MockModel1);
        const m2 = factory.getInstance<MockModel2>(MockModel2);
        const m3 = factory.getInstance<MockModel2>(MockModel2);

        c.addModel(m1).addModel(m2).addModel(m3);

        c.map(MockMessageType.HELLO, MockCommand24).addTargetGuards(m1, false);

        m1.dispatchMessage(MockMessageType.HELLO);
        m2.dispatchMessage(MockMessageType.HELLO);
        m3.dispatchMessage(MockMessageType.HELLO);

        expect(m2.testVar).equals(5);
        expect(MockCommand24.executedTimes).equals(2);
    });
});