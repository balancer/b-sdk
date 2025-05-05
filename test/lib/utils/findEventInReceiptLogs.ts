import { Address, Log, TransactionReceipt, decodeEventLog } from 'viem';

export const findEventInReceiptLogs = ({
    receipt,
    to,
    abi,
    eventName,
}: {
    receipt: TransactionReceipt;
    to: Address;
    abi: readonly unknown[];
    eventName: string;
    // biome-ignore lint/suspicious/noExplicitAny: <args can be of multiple type>
}): { eventName: string; args: any } => {
    const event = receipt.logs
        .filter((log: Log) => {
            return log.address.toLowerCase() === to.toLowerCase();
        })
        .map((log) => {
            return decodeEventLog({ abi, ...log });
        })
        .find((decodedLog) => decodedLog?.eventName === eventName);
    if (!event) {
        throw new Error('Event not found in logs');
    }
    return event;
};
