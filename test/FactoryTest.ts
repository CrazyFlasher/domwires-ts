import "reflect-metadata";
import {Suite} from "mocha";
import {Factory, IFactory, Logger, MappingConfigDictionary} from "../src";
import {expect} from "chai";
import {
    IMockObject3,
    IMockPool1,
    IMockPool2,
    MockBusyPoolObject,
    MockObj1,
    MockObject,
    MockObject2,
    MockObject3,
    IMockObject,
    MockPool1,
    MockPool2,
    MockPool3,
    MockPool4
} from "./mock/IMockObject";
import {MockCommand1} from "./mock/MockCommands";
import {ISuperCoolModel, MockModel0} from "./mock/MockModels";

describe('FactoryTest', function (this: Suite)
{
    let factory: IFactory;

    beforeEach(() =>
    {
        factory = new Factory(new Logger());
    });

    afterEach(() =>
    {
        factory.dispose();
    });

    it('testInjectWithNameAndNoName', () =>
    {
        factory.mapToValue("number", 5);
        factory.mapToValue("number", 7, "n2");

        expect(function (): void {
            factory.getInstance<MockModel0>(MockModel0);
        }).not.throw();
    });

    it('testAutoRemap', () =>
    {
        // will remap only once
        factory.mapToValue("IFactory", factory);
        factory.mapToValue("IFactory", factory);
        factory.mapToValue("IFactory", factory);
        factory.mapToValue("IFactory", factory);
        factory.mapToValue("IFactory", factory);
        factory.mapToValue("IFactory", factory);
        factory.mapToValue("IFactory", factory);
        factory.mapToValue("IFactory", factory);
        factory.mapToValue("IFactory", factory);
        factory.mapToValue("IFactory", factory);
        factory.mapToValue("IFactory", factory);
        factory.mapToValue("IFactory", factory);
        factory.mapToValue("IFactory", factory);

        const f = factory.getInstance("IFactory");

        expect(f).equals(factory);
    });

    it('testInstantiateUnmappedToValue', () =>
    {
        const o1: MockObj1 = factory.getInstance<MockObj1>(MockObj1);
        factory.mapToValue<MockObj1>(MockObj1, o1);

        let o2: MockObj1 = factory.getInstance<MockObj1>(MockObj1);

        expect(o1).equals(o2);

        o2 = factory.instantiateValueUnmapped<MockObj1>(MockObj1);

        expect(o1).not.equals(o2);
    });

    it('testInstantiateUnmappedFromInterface', () =>
    {
        expect(() => factory.instantiateValueUnmapped("IMockObj1")).not.throw();
    });

    it('testInstantiateUnmappedInject', () =>
    {
        factory.mapToValue("string[]", ["a", "b", "c"]);
        factory.mapToValue("number", 5, "coolNumber");
        factory.mapToValue("any", {value: "test"});
        factory.mapToValue("string", "123");
        factory.mapToValue<MockObject2>(MockObject2, new MockObject2());

        expect(() => factory.instantiateValueUnmapped("IMockObject")).not.throw();
    });

    it('testClear', () =>
    {
        factory.mapToType<MockObject>("IMockObject", MockObject);
        factory.mapToType<MockObject>("IMockObject", MockObject, "opa");

        expect(factory.hasTypeMapping("IMockObject")).true;
        expect(factory.hasTypeMapping("IMockObject", "opa")).true;

        factory.clear();

        expect(factory.hasTypeMapping("IMockObject")).false;
        expect(factory.hasTypeMapping("IMockObject", "opa")).false;
    });

    it('testMapUnmapType', () =>
    {
        expect(factory.hasTypeMapping("IMockObject")).false;
        expect(factory.hasTypeMapping("IMockObject", "opa")).false;

        factory.mapToType<MockObject>("IMockObject", MockObject);

        expect(factory.hasTypeMapping("IMockObject")).true;
        expect(factory.hasTypeMapping("IMockObject", "opa")).false;

        factory.mapToType<MockObject>("IMockObject", MockObject, "opa");

        // Should throw remap warning
        factory.mapToType<MockObject>("IMockObject", MockObject, "opa");

        expect(factory.hasTypeMapping("IMockObject", "opa")).true;
        expect(factory.hasTypeMapping("IMockObject")).true;

        factory.unmapFromType("IMockObject");

        expect(factory.hasTypeMapping("IMockObject")).false;
        expect(factory.hasTypeMapping("IMockObject", "opa")).true;

        factory.unmapFromType("IMockObject", "opa");

        expect(factory.hasTypeMapping("IMockObject")).false;
        expect(factory.hasTypeMapping("IMockObject", "opa")).false;
    });

    it('testMapUnmapValue', () =>
    {
        factory.mapToValue("string[]", ["a", "b", "c"]);
        factory.mapToValue("number", 5, "coolNumber");
        factory.mapToValue("any", {value: "test"});
        factory.mapToValue("string", "123");
        factory.mapToValue<MockObject2>(MockObject2, new MockObject2());

        expect(factory.hasValueMapping("string[]")).true;
        expect(factory.hasValueMapping("number")).false;
        expect(factory.hasValueMapping("number", "coolNumber")).true;
        expect(factory.hasValueMapping("any")).true;
        expect(factory.hasValueMapping("string")).true;
        expect(factory.hasValueMapping<MockObject2>(MockObject2)).true;

        factory.unmapFromValue("number");

        expect(factory.hasValueMapping("number", "coolNumber")).true;

        factory.unmapFromValue("number", "coolNumber");

        expect(factory.hasValueMapping("number", "coolNumber")).false;
    });

    it('testGetInstance', () =>
    {
        factory.mapToValue("number", 5, "coolNumber");

        expect(factory.getInstance("number", "coolNumber")).equals(5);
    });

    it('testInjectPostConstruct', () =>
    {
        factory.mapToValue("string[]", ["a", "b", "c"]);
        factory.mapToValue("number", 5, "coolNumber");
        factory.mapToValue("any", {value: "test"});
        factory.mapToValue("string", "123");
        factory.mapToValue<MockObject2>(MockObject2, new MockObject2());

        const obj: IMockObject = factory.getInstance("IMockObject");

        expect(obj.g[1]).equals("b");
        expect(obj.n).equals(5);
        expect(obj.o.value).equals("test");
        expect(obj.s).equals("123");
        expect(obj.mo.n).equals(7);
        expect(obj.pc).true;
    });

    it('testRegisterPool', () =>
    {
        expect(factory.hasPoolForType("IMockObject")).false;
        factory.registerPool("IMockObject");
        expect(factory.hasPoolForType("IMockObject")).true;
    });

    it('testUnregisterPool', () =>
    {
        factory.registerPool("IMockObject");
        expect(factory.hasPoolForType("IMockObject")).true;
        factory.unregisterPool("IMockObject");
        expect(factory.hasPoolForType("IMockObject")).false;
    });

    it('testGetFromPool', () =>
    {
        factory.mapToType<IMockObject3>("IMockObject3", MockObject3);
        factory.registerPool("IMockObject3");
        const o: IMockObject3 = factory.getInstance<IMockObject3>("IMockObject3");
        expect(o.a).equals(500);
        expect(o.b).equals(700);
    });

    it('testClearPool', () =>
    {
        factory.registerPool<IMockObject3>("IMockObject3");
        factory.clear();
        expect(factory.hasPoolForType<IMockObject3>("IMockObject3")).false;
    });

    it('testHasPoolForType', () =>
    {
        expect(factory.hasPoolForType<IMockObject3>("IMockObject3")).false;
        factory.registerPool<IMockObject3>("IMockObject3");
        expect(factory.hasPoolForType<IMockObject3>("IMockObject3")).true;
    });

    it('testMapPoolToInterface', () =>
    {
        factory.mapToType<IMockPool1>("IMockPool1", MockPool1);
        factory.registerPool<IMockPool1>("IMockPool1");

        const p: IMockPool1 = factory.getInstance("IMockPool1");
        expect(p.value).equals(1);

        factory.mapToType<IMockPool1>("IMockPool1", MockPool2);
        factory.registerPool<IMockPool1>("IMockPool1");

        const p2: IMockPool1 = factory.getInstance<IMockPool1>("IMockPool1");
        expect(p2.value).equals(2);
    });

    it('testInjectDependenciesToPoolObject', () =>
    {
        factory.mapToType<IMockPool1>("IMockPool1", MockPool3);
        factory.registerPool("IMockPool1");
        factory.mapToValue("number", 5, "v");
        const p1: IMockPool1 = factory.getInstance("IMockPool1");
        expect(p1.value).equals(6);
    });

    it('testGetPoolCapacity', () =>
    {
        factory.registerPool("IMockPool2", 100);

        const capacity: number = factory.getPoolCapacity<IMockPool2>("IMockPool2");

        expect(capacity).equals(100);
    });

    it('testGetPoolTotalInstancesCount', () =>
    {
        factory.mapToType<IMockPool2>("IMockPool2", MockPool4);
        factory.registerPool("IMockPool2", 100);

        for (let i = 0; i < 5; i++)
        {
            factory.getInstance("IMockPool2");
        }

        const count: number = factory.getPoolInstanceCount("IMockPool2");

        expect(count).equals(5);
    });

    it('testExtendPool', () =>
    {
        factory.registerPool("IMockPool2", 100);
        factory.increasePoolCapacity("IMockPool2", 5);

        const capacity: number = factory.getPoolCapacity("IMockPool2");

        expect(capacity).equals(105);
    });

    it('testGetInstanceFromPool', () =>
    {
        factory.mapToType<IMockPool2>("IMockPool2", MockPool4);
        factory.registerPool("IMockPool2", 2);

        const instance1: IMockPool2 = factory.getInstance("IMockPool2");
        const instance2: IMockPool2 = factory.getInstance("IMockPool2");

        let instanceFromPool: IMockPool2;
        instanceFromPool = factory.getInstance("IMockPool2");
        expect(instanceFromPool).equals(instance1);

        instanceFromPool = factory.getInstance("IMockPool2");
        expect(instanceFromPool).equals(instance2);

        instanceFromPool = factory.getInstance("IMockPool2");
        expect(instanceFromPool).equals(instance1);
    });

    it('testOfPoolObjectsAreUnique', () =>
    {
        factory.mapToType<IMockPool1>("IMockPool1", MockPool1);
        factory.registerPool("IMockPool1", 2, true);

        const o1: IMockPool1 = factory.getInstance("IMockPool1");
        const o2: IMockPool1 = factory.getInstance("IMockPool1");

        expect(o1).not.equals(o2);
    });

    it('testReturnOnlyNotBusyObjectsFromPool', () =>
    {
        factory.mapToType<MockBusyPoolObject>(MockBusyPoolObject, MockBusyPoolObject);
        factory.registerPool<MockBusyPoolObject>(MockBusyPoolObject, 2, true, "isBusy");

        const o1: MockBusyPoolObject = factory.getInstance<MockBusyPoolObject>(MockBusyPoolObject);
        o1.isBusy = true;

        factory.getInstance<MockBusyPoolObject>(MockBusyPoolObject);

        const o2: MockBusyPoolObject = factory.getInstance<MockBusyPoolObject>(MockBusyPoolObject);
        expect(o2.isBusy).false;
        expect(o1).not.equals(o2);
    });

    it('testAllPoolItemAreBusy', () =>
    {
        factory.mapToType<MockBusyPoolObject>(MockBusyPoolObject, MockBusyPoolObject);
        factory.registerPool<MockBusyPoolObject>(MockBusyPoolObject, 2, true, "isBusy");

        expect(factory.getAllPoolItemsAreBusy<MockBusyPoolObject>(MockBusyPoolObject)).false;

        const o1: MockBusyPoolObject = factory.getInstance<MockBusyPoolObject>(MockBusyPoolObject);
        o1.isBusy = true;

        expect(factory.getAllPoolItemsAreBusy<MockBusyPoolObject>(MockBusyPoolObject)).false;

        const o2: MockBusyPoolObject = factory.getInstance<MockBusyPoolObject>(MockBusyPoolObject);
        o2.isBusy = true;

        expect(factory.getAllPoolItemsAreBusy<MockBusyPoolObject>(MockBusyPoolObject)).true;

        factory.increasePoolCapacity<MockBusyPoolObject>(MockBusyPoolObject, 1);

        expect(factory.getAllPoolItemsAreBusy<MockBusyPoolObject>(MockBusyPoolObject)).false;

        const o3: MockBusyPoolObject = factory.getInstance<MockBusyPoolObject>(MockBusyPoolObject);
        o3.isBusy = true;

        expect(factory.getAllPoolItemsAreBusy<MockBusyPoolObject>(MockBusyPoolObject)).true;
    });

    it('testAllPoolItemAreBusyIncrease', () =>
    {
        factory.mapToType<MockBusyPoolObject>(MockBusyPoolObject, MockBusyPoolObject);
        factory.registerPool<MockBusyPoolObject>(MockBusyPoolObject, 2, true, "isBusy");

        expect(factory.getAllPoolItemsAreBusy<MockBusyPoolObject>(MockBusyPoolObject)).false;

        const o1: MockBusyPoolObject = factory.getInstance<MockBusyPoolObject>(MockBusyPoolObject);
        o1.isBusy = true;
        const o2: MockBusyPoolObject = factory.getInstance<MockBusyPoolObject>(MockBusyPoolObject);
        o2.isBusy = true;

        expect(factory.getAllPoolItemsAreBusy<MockBusyPoolObject>(MockBusyPoolObject)).true;

        factory.getInstance<MockBusyPoolObject>(MockBusyPoolObject);
    });

    it('testPoolItemsBusyCount', () =>
    {
        factory.mapToType<MockBusyPoolObject>(MockBusyPoolObject, MockBusyPoolObject);
        factory.registerPool<MockBusyPoolObject>(MockBusyPoolObject, 3, true, "isBusy");

        const o1: MockBusyPoolObject = factory.getInstance<MockBusyPoolObject>(MockBusyPoolObject);
        o1.isBusy = true;
        const o2: MockBusyPoolObject = factory.getInstance<MockBusyPoolObject>(MockBusyPoolObject);
        o2.isBusy = true;
        const o3: MockBusyPoolObject = factory.getInstance<MockBusyPoolObject>(MockBusyPoolObject);
        o3.isBusy = true;

        expect(factory.getAllPoolItemsAreBusy<MockBusyPoolObject>(MockBusyPoolObject)).true;

        o2.isBusy = false;

        expect(factory.getPoolBusyInstanceCount<MockBusyPoolObject>(MockBusyPoolObject)).equals(2);

        const o4: MockBusyPoolObject = factory.getInstance<MockBusyPoolObject>(MockBusyPoolObject);
        o4.isBusy = true;

        expect(o4).equals(o2);

        expect(factory.getPoolBusyInstanceCount<MockBusyPoolObject>(MockBusyPoolObject)).equals(3);
        expect(factory.getAllPoolItemsAreBusy<MockBusyPoolObject>(MockBusyPoolObject)).true;
    });

    it('testAutoExtendPool', () =>
    {
        factory.mapToType<MockBusyPoolObject>(MockBusyPoolObject, MockBusyPoolObject);
        factory.registerPool<MockBusyPoolObject>(MockBusyPoolObject, 1, true, "isBusy");

        let o: MockBusyPoolObject = factory.getInstance<MockBusyPoolObject>(MockBusyPoolObject);
        o.isBusy = true;

        for (let i = 0; i < 2; i++)
        {
            o = factory.getInstance<MockBusyPoolObject>(MockBusyPoolObject);
            o.isBusy = true;
        }

        expect(factory.getPoolCapacity<MockBusyPoolObject>(MockBusyPoolObject)).equals(3);
    });

    it("testMappingViaConfig", () =>
    {
        /* eslint-disable @typescript-eslint/no-explicit-any */

        const json: any = {};

        json["IDefault$def"] = {
            implementation: "Default",
            newInstance: true
        };

        json["ISuperCoolModel"] = {
            implementation: "SuperCoolModel"
        };

        json["number$coolValue"] = {
            value: 7
        };

        json["boolean$myBool"] = {
            value: false
        };

        json["number"] = {
            value: 5
        };

        json["any$obj"] = {
            value: {
                firstName: "nikita",
                lastName: "dzigurda"
            }
        };

        json["string[]"] = {
            value: ["botan", "sjava"]
        };

        const jsonOverride = {
            "number$coolValue": {
                value: 5
            }
        };

        factory.appendMappingConfig(new MappingConfigDictionary(json).map);
        factory.appendMappingConfig(new MappingConfigDictionary(jsonOverride).map);

        const m: ISuperCoolModel = factory.getInstance<ISuperCoolModel>("ISuperCoolModel");
        expect(m.getCoolValue).equals(5);
        expect(m.getMyBool).equals(false);
        expect(m.value).equals(5);
        expect(m.def.result).equals(123);
        expect(m.object.firstName).equals("nikita");
        expect(m.object.lastName).equals("dzigurda");
        expect(m.array[1]).equals("sjava");
    });

    it('testMapToTypeAndValueOfSameType', () =>
    {
        factory.mapToType<MockObj1>(MockObj1, MockObj1);
        factory.mapToValue<MockObj1>(MockObj1, factory.getInstance<MockObj1>(MockObj1));

        factory.getInstance<MockCommand1>(MockCommand1);
    });

    it('testMapToValueWithName', () =>
    {
        factory.mapToValue<MockObj1>(MockObj1, factory.getInstance<MockObj1>(MockObj1));

        factory.getInstance<MockObj1>(MockObj1);
    });
});