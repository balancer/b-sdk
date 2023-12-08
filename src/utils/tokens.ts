import { Token } from "../entities";

export function sortTokensByAddress(tokens: Token[]) {
    return tokens.sort((a, b) => a.address.localeCompare(b.address));
}