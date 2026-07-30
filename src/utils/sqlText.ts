export function sqlText(
    strings: TemplateStringsArray, 
    ...values: readonly (string | number | boolean | null)[]
): string {
    let result = strings[0] ?? "";
    for (let index = 0; index < values.length; index++) {
        result += String(values[index]);
        result += strings[index + 1] ?? "";
    }

    return result;
}
