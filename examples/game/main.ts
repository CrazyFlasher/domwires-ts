import {GameDemo} from "./GameDemo";
import {GameViewFactory} from "./views/IGameViewFactory";

const demo = new GameDemo(new GameViewFactory(document));

void demo.start().catch(error => console.error("Could not start the demo:", error));
