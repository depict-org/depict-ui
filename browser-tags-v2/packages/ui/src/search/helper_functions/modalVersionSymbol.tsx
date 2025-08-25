/**
 * Symbol used to identify the version of a SearchModal function. Values right now: 1 = 1st gen classic modal, 2 = second gen modal
 */
export const modalVersionSymbol = Symbol("modalVersion");

/**
 * Symbol to store a backicon inside of the modal function, seens the back icon has to be different for every modal but the search field is not always in the modal
 */
export const backIconSymbol = Symbol("backIcon");
