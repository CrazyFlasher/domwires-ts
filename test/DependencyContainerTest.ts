import {Suite} from "mocha";
import {expect} from "chai";
import {DependencyContainer} from "../src";
import {DiBase, DiConsumer, DiDerived, DiOtherService, DiService} from "./mock/DiMocks";

describe('DependencyContainerTest', function (this: Suite)
{
    let container: DependencyContainer;

    beforeEach(() =>
    {
        container = new DependencyContainer();

        container.bindToValue("string", "123");
        container.bindToValue("string", "withName", "namedValue");
    });

    it('testBindToTypeCreatesNewInstance', () =>
    {
        container.bindToType("Service", DiService);

        const first: DiService = container.resolve<DiService>("Service");
        const second: DiService = container.resolve<DiService>("Service");

        expect(first).instanceof(DiService);
        expect(first).not.equals(second);
    });

    it('testBindToValueReturnsSameValue', () =>
    {
        const service: DiService = new DiService();

        container.bindToValue("Service", service);

        expect(container.resolve<DiService>("Service")).equals(service);
    });

    it('testNamedBindings', () =>
    {
        expect(container.resolve<string>("string")).equals("123");
        expect(container.resolve<string>("string", "namedValue")).equals("withName");
    });

    it('testValueBindingWinsOverTypeBinding', () =>
    {
        const service: DiService = new DiService();

        container.bindToType("Service", DiService);
        container.bindToValue("Service", service);

        expect(container.resolve<DiService>("Service")).equals(service);
    });

    it('testUnmappedClassIsInstantiated', () =>
    {
        expect(container.resolve<DiOtherService>(DiOtherService)).instanceof(DiOtherService);
    });

    it('testMissingBindingThrows', () =>
    {
        expect(() => container.resolve("UnboundService")).to.throw("No binding found");
    });

    it('testInjection', () =>
    {
        const consumer: DiConsumer = container.resolve<DiConsumer>(DiConsumer);

        expect(consumer.value).equals("123");
        expect(consumer.namedValue).equals("withName");
        expect(consumer.optionalValue).equals(undefined);
        expect(consumer.other).instanceof(DiOtherService);
        expect(consumer.postConstructCalled).true;
    });

    it('testInjectionsAreNotSharedBetweenClasses', () =>
    {
        const derived: DiDerived = container.resolve<DiDerived>(DiDerived);

        expect(derived.baseValue).equals("123");
        expect(derived.derivedValue).equals("withName");

        // the base class must not receive injections of the derived one
        const base: DiBase = container.resolve<DiBase>(DiBase);

        expect(base.baseValue).equals("123");
    });

    it('testUnbind', () =>
    {
        container.unbind("string", "namedValue");

        expect(container.has("string", "namedValue")).false;
        expect(container.has("string")).true;

        container.unbind("string");

        expect(container.has("string")).false;
        expect(container.has("string", "namedValue")).false;
    });
});
