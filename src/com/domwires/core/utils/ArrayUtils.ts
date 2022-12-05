export class ArrayUtils
{
    /**
     * Clears array.
     * @param array input array
     */
    public static clear<T>(array: T[]): void
    {
        if (!array) throw new Error("Array does not exist!!");

        array.length = 0;
    }

    /**
     * Checks if element is the last in input array.
     * @param array input array
     * @param element element to check
     * @return true, if element is the last
     */
    public static isLast<T>(array: ReadonlyArray<T>, element: T): boolean
    {
        if (!array) throw new Error("Array does not exist!!");

        return array.length !== 0 && array.lastIndexOf(element) === array.length - 1;
    }

    /**
     * Checks if input array contains element.
     * @param array input array
     * @param element element to check
     * @return true, if input array contains element
     */
    public static contains<T>(array: ReadonlyArray<T>, element: T): boolean
    {
        if (!array) throw new Error("Array does not exist!!");

        return array.length !== 0 && array.indexOf(element) !== -1;
    }

    /**
     * Removes element from array.
     * @param array input array
     * @param element element to remove from input array
     */
    public static remove<T>(array: T[], element: T): void
    {
        if (!array) throw new Error("Array does not exist!!");
        const index = array.indexOf(element);
        if (index !== -1)
        {
            array.splice(index, 1);
        }
    }
}