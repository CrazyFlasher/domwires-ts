import "reflect-metadata";
import {Suite} from "mocha";
import {AppFactory, IAppFactory} from "../src/com/domwires/core/factory/IAppFactory";
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
    MockObjects,
    MockPool1,
    MockPool2,
    MockPool3,
    MockPool4
} from "./mock/MockObjects";
import {MockCommand1} from "./mock/MockCommands";

describe('AppFactoryTest', function (this: Suite)
{
    let factory: IAppFactory;

    beforeEach(() =>
    {
        factory = new AppFactory();
    });

    afterEach(() =>
    {
        factory.dispose();
    });

    it('testAutoRemap', () =>
    {
        // will remap only one
        factory.mapToValue("IAppFactory", factory);
        factory.mapToValue("IAppFactory", factory);
        factory.mapToValue("IAppFactory", factory);
        factory.mapToValue("IAppFactory", factory);
        factory.mapToValue("IAppFactory", factory);
        factory.mapToValue("IAppFactory", factory);
        factory.mapToValue("IAppFactory", factory);
        factory.mapToValue("IAppFactory", factory);
        factory.mapToValue("IAppFactory", factory);
        factory.mapToValue("IAppFactory", factory);
        factory.mapToValue("IAppFactory", factory);
        factory.mapToValue("IAppFactory", factory);
        factory.mapToValue("IAppFactory", factory);

        const f = factory.getInstance("IAppFactory");

        expect(f).equals(factory);
    });

    it('testInstantiateUnmappedToValue', () =>
    {
        const o1:MockObj1 = factory.getInstance(MockObj1);
        factory.mapToValue(MockObj1, o1);

        let o2:MockObj1 = factory.getInstance(MockObj1);

        expect(o1).equals(o2);

        o2 = factory.instantiateValueUnmapped(MockObj1);

        expect(o1).not.equals(o2);
    });

    it('testInstantiateUnmappedFromInterface', () =>
    {
        expect(factory.instantiateValueUnmapped("IMockObj1")).not.throw;
    });

    it('testInstantiateUnmappedInject', () =>
    {
        factory.mapToValue("string[]", ["a", "b", "c"]);
        factory.mapToValue("number", 5, "coolNumber");
        factory.mapToValue("any", {value: "test"});
        factory.mapToValue("string", "123");
        factory.mapToValue(MockObject2, new MockObject2());

        expect(factory.instantiateValueUnmapped("IMockObject")).not.throw;
    });

    /*it('testLazyInject', () =>
    {
        function copyDictionary(
            origin: interfaces.Lookup<interfaces.Binding<any>>,
            destination: interfaces.Lookup<interfaces.Binding<any>>
        ) {

            origin.traverse((key, value) => {
                value.forEach((binding) => {
                    destination.add(binding.serviceIdentifier, binding.clone());
                });
            });

        }

        const globalContainer: Container = new Container();

        const {lazyInject, lazyInjectNamed} = getDecorators(globalContainer, false);

        class AppFactory
        {
            public container: Container = new Container({autoBindInjectable: true});

            public mapToValue(type:any, to:any, name?:string):void
            {
                if (!name)
                {
                    if (this.container.isBound(type))
                    {
                        this.container.unbind(type);
                    }

                    this.container.bind(type).toConstantValue(to);
                } else
                {
                    if (this.container.isBoundNamed(type, name))
                    {
                        this.container.unbind(type);
                    }

                    this.container.bind(type).toConstantValue(to).whenTargetNamed(name);
                }
            }

            public getInstance(type:any, name?:any):any
            {
                return !name ? this.container.get(type) : this.container.getNamed(type, name);
            }
        }

        @injectable()
        class Obj
        {
            @lazyInjectNamed("string", "olo")
            private _s:string;

            get s(): string
            {
                return this._s;
            }
        }

        class Main
        {
            private f_1:AppFactory = new AppFactory();
            private f_2:AppFactory = new AppFactory();

            constructor()
            {
                this.f_1.mapToValue("string", "aaa", "olo");
                this.f_2.mapToValue("string", "bbb", "olo");

                copyDictionary(getBindingDictionary(this.f_1.container), getBindingDictionary(globalContainer));

                let o_1:Obj = this.f_1.getInstance(Obj);
                expect(o_1.s).equals("aaa");

                globalContainer.unbindAll();

                copyDictionary(getBindingDictionary(this.f_2.container), getBindingDictionary(globalContainer));

                let o_2:Obj = this.f_2.getInstance(Obj);
                expect(o_2.s).equals("bbb");

                globalContainer.unbindAll();

                this.f_1.mapToValue(Obj, o_1, "o1");
                this.f_2.mapToValue(Obj, o_2, "o2");

                this.f_1.mapToValue("string", "ccc", "olo");
                this.f_2.mapToValue("string", "ddd", "olo");

                copyDictionary(getBindingDictionary(this.f_1.container), getBindingDictionary(globalContainer));

                let o_3:Obj = this.f_1.getInstance(Obj, "o1");

                // string is re-injected to already existing objects
                expect(o_3.s).equals("ccc");

                globalContainer.unbindAll();

                copyDictionary(getBindingDictionary(this.f_2.container), getBindingDictionary(globalContainer));

                let o_4:Obj = this.f_2.getInstance(Obj, "o2");

                // string is re-injected to already existing objects
                expect(o_4.s).equals("ddd");

                expect(o_3).equals(o_1);
                expect(o_4).equals(o_2);
            }
        }

        new Main();
    });*/

    it('testClear', () =>
    {
        factory.mapToType("IMockObject", MockObject);
        factory.mapToType("IMockObject", MockObject, "opa");

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

        factory.mapToType("IMockObject", MockObject);

        expect(factory.hasTypeMapping("IMockObject")).true;
        expect(factory.hasTypeMapping("IMockObject", "opa")).false;

        factory.mapToType("IMockObject", MockObject, "opa");

        // Should throw remap warning
        factory.mapToType("IMockObject", MockObject, "opa");

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
        factory.mapToValue(MockObject2, new MockObject2());

        expect(factory.hasValueMapping("string[]")).true;
        expect(factory.hasValueMapping("number")).false;
        expect(factory.hasValueMapping("number", "coolNumber")).true;
        expect(factory.hasValueMapping("any")).true;
        expect(factory.hasValueMapping("string")).true;
        expect(factory.hasValueMapping(MockObject2)).true;

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
        factory.mapToValue(MockObject2, new MockObject2());

        const obj: MockObjects = factory.getInstance("IMockObject");

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
        factory.mapToType("IMockObject3", MockObject3);
        factory.registerPool("IMockObject3");
        const o: IMockObject3 = factory.getInstance("IMockObject3");
        expect(o.a).equals(500);
        expect(o.b).equals(700);
    });

    it('testClearPool', () =>
    {
        factory.registerPool("IMockObject3");
        factory.clear();
        expect(factory.hasPoolForType("IMockObject3")).false;
    });

    it('testHasPoolForType', () =>
    {
        expect(factory.hasPoolForType("IMockObject3")).false;
        factory.registerPool("IMockObject3");
        expect(factory.hasPoolForType("IMockObject3")).true;
    });

    it('testMapPoolToInterface', () =>
    {
        factory.mapToType("IMockPool1", MockPool1);
        factory.registerPool("IMockPool1");

        const p: IMockPool1 = factory.getInstance("IMockPool1");
        expect(p.value).equals(1);

        factory.mapToType("IMockPool1", MockPool2);
        factory.registerPool("IMockPool1");

        const p2: IMockPool1 = factory.getInstance("IMockPool1");
        expect(p2.value).equals(2);
    });

    it('testInjectDependenciesToPoolObject', () =>
    {
        factory.mapToType("IMockPool1", MockPool3);
        factory.registerPool("IMockPool1");
        factory.mapToValue("number", 5, "v");
        const p1: IMockPool1 = factory.getInstance("IMockPool1");
        expect(p1.value).equals(6);
    });

    it('testGetPoolCapacity', () =>
    {
        factory.registerPool("IMockPool2", 100);

        const capacity: number = factory.getPoolCapacity("IMockPool2");

        expect(capacity).equals(100);
    });

    it('testGetPoolTotalInstancesCount', () =>
    {
        factory.mapToType("IMockPool2", MockPool4);
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
        factory.mapToType("IMockPool2", MockPool4);
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
        factory.mapToType("IMockPool1", MockPool1);
        factory.registerPool("IMockPool1", 2, true);

        const o1: IMockPool1 = factory.getInstance("IMockPool1");
        const o2: IMockPool1 = factory.getInstance("IMockPool1");

        expect(o1).not.equals(o2);
    });

    it('testReturnOnlyNotBusyObjectsFromPool', () =>
    {
        factory.mapToType(MockBusyPoolObject, MockBusyPoolObject);
        factory.registerPool(MockBusyPoolObject, 2, true, "isBusy");

        const o1: MockBusyPoolObject = factory.getInstance(MockBusyPoolObject);
        o1.isBusy = true;

        factory.getInstance(MockBusyPoolObject);

        const o2: MockBusyPoolObject = factory.getInstance(MockBusyPoolObject);
        expect(o2.isBusy).not.exist;
        expect(o1).not.equals(o2);
    });

    it('testAllPoolItemAreBusy', () =>
    {
        factory.mapToType(MockBusyPoolObject, MockBusyPoolObject);
        factory.registerPool(MockBusyPoolObject, 2, true, "isBusy");

        expect(factory.getAllPoolItemsAreBusy(MockBusyPoolObject)).false;

        const o1: MockBusyPoolObject = factory.getInstance(MockBusyPoolObject);
        o1.isBusy = true;

        expect(factory.getAllPoolItemsAreBusy(MockBusyPoolObject)).false;

        const o2: MockBusyPoolObject = factory.getInstance(MockBusyPoolObject);
        o2.isBusy = true;

        expect(factory.getAllPoolItemsAreBusy(MockBusyPoolObject)).true;

        factory.increasePoolCapacity(MockBusyPoolObject, 1);

        expect(factory.getAllPoolItemsAreBusy(MockBusyPoolObject)).false;

        const o3: MockBusyPoolObject = factory.getInstance(MockBusyPoolObject);
        o3.isBusy = true;

        expect(factory.getAllPoolItemsAreBusy(MockBusyPoolObject)).true;
    });

    it('testAllPoolItemAreBusyIncrease', () =>
    {
        factory.mapToType(MockBusyPoolObject, MockBusyPoolObject);
        factory.registerPool(MockBusyPoolObject, 2, true, "isBusy");

        expect(factory.getAllPoolItemsAreBusy(MockBusyPoolObject)).false;

        const o1: MockBusyPoolObject = factory.getInstance(MockBusyPoolObject);
        o1.isBusy = true;
        const o2: MockBusyPoolObject = factory.getInstance(MockBusyPoolObject);
        o2.isBusy = true;

        expect(factory.getAllPoolItemsAreBusy(MockBusyPoolObject)).true;

        factory.getInstance(MockBusyPoolObject);
    });

    it('testPoolItemsBusyCount', () =>
    {
        factory.mapToType(MockBusyPoolObject, MockBusyPoolObject);
        factory.registerPool(MockBusyPoolObject, 3, true, "isBusy");

        const o1: MockBusyPoolObject = factory.getInstance(MockBusyPoolObject);
        o1.isBusy = true;
        const o2: MockBusyPoolObject = factory.getInstance(MockBusyPoolObject);
        o2.isBusy = true;
        const o3: MockBusyPoolObject = factory.getInstance(MockBusyPoolObject);
        o3.isBusy = true;

        expect(factory.getAllPoolItemsAreBusy(MockBusyPoolObject)).true;

        o2.isBusy = false;

        expect(factory.getPoolBusyInstanceCount(MockBusyPoolObject)).equals(2);

        const o4: MockBusyPoolObject = factory.getInstance(MockBusyPoolObject);
        o4.isBusy = true;

        expect(o4).equals(o2);

        expect(factory.getPoolBusyInstanceCount(MockBusyPoolObject)).equals(3);
        expect(factory.getAllPoolItemsAreBusy(MockBusyPoolObject)).true;
    });

    it('testAutoExtendPool', () =>
    {
        factory.mapToType(MockBusyPoolObject, MockBusyPoolObject);
        factory.registerPool(MockBusyPoolObject, 1, true, "isBusy");

        let o: MockBusyPoolObject = factory.getInstance(MockBusyPoolObject);
        o.isBusy = true;

        for (let i = 0; i < 2; i++)
        {
            o = factory.getInstance(MockBusyPoolObject);
            o.isBusy = true;
        }

        expect(factory.getPoolCapacity(MockBusyPoolObject)).equals(3);
    });

    it('testMapToTypeAndValueOfSameType', () =>
    {
        factory.mapToType(MockObj1, MockObj1);
        factory.mapToValue(MockObj1, factory.getInstance(MockObj1));

        factory.getInstance(MockCommand1);
    });

    it('testMapToValueWithName', () =>
    {
        factory.mapToValue(MockObj1, factory.getInstance(MockObj1));

        factory.getInstance(MockObj1);
    });

    /*it('teeest', () =>
    {
        function inject(name?:string, optional:boolean = false)
        {
            return Reflect.metadata("inject", {name: name, optional: optional});
        }

        function getInject(target: any, propertyKey: string) {
            return Reflect.getMetadata("inject", target, propertyKey);
        }

        class Obj
        {
            @inject("asd", true)
            private a:number;

            @inject()
            private b:string;

            private init():void
            {
                console.log(this.a);
            }
        }

        let o = new Obj();
        console.log(Reflect.getMetadata("inject", o, "a"));

        Reflect.set(o, "b", "123");
        Reflect.set(o, "a", 5);
        Reflect.set(o, "c", 77);

        for (let p in o)
        {
            console.log(p);
        }
    });*/

});