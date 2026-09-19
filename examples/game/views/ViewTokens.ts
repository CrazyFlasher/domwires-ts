import {IMessageDispatcherImmutable, ServiceToken} from "../../../src";
import type {IGameViewFactory} from "./IGameViewFactory";

export const VIEW_FACTORY = new ServiceToken<IGameViewFactory>("GameViewFactory");
export const GAME_EVENTS = new ServiceToken<IMessageDispatcherImmutable>("GameEvents");
