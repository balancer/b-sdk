export function sortTokensByAddress(tokens: (any & { address: string })[]) {
    return tokens.sort((a, b) => a.address.localeCompare(b.address));
}
