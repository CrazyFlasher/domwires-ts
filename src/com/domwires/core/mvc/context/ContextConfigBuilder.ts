import type {ContextConfig} from "./AbstractContext";

/** Builds the four in-context message-forwarding switches. */
export class ContextConfigBuilder
{
    /** Forward intentions directly to model listeners. Default false. */
    public forwardMessageFromMediatorsToModels = false;
    /** Forward messages between mediators. Default true. */
    public forwardMessageFromMediatorsToMediators = true;
    /** Forward model notifications to mediators. Default true. */
    public forwardMessageFromModelsToMediators = true;
    /** Forward messages between models. Default false. */
    public forwardMessageFromModelsToModels = false;

    /** Returns a new configuration value; later builder edits do not change previous results. */
    public build(): ContextConfig
    {
        return {
            forwardMessageFromMediatorsToModels: this.forwardMessageFromMediatorsToModels,
            forwardMessageFromMediatorsToMediators: this.forwardMessageFromMediatorsToMediators,
            forwardMessageFromModelsToMediators: this.forwardMessageFromModelsToMediators,
            forwardMessageFromModelsToModels: this.forwardMessageFromModelsToModels
        };
    }
}
