import type { ICommand } from "../interfaces";

export default {
    name: "match",
    description: "checks your spelling and shows the correct sentence if you made a mistake",
    format: "match [string]",
    disabled: true,
    function(_message) {},
} satisfies ICommand;
