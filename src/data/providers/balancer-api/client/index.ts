import { ChainId } from '../../../../utils';

/**
 * Window with Balancer SDK client config properties
 */
interface WindowWithConfig {
    BALANCER_SDK_CLIENT_NAME?: string;
    BALANCER_SDK_CLIENT_VERSION?: string;
}

/**
 * Client options for the Balancer API
 */
export interface BalancerApiClientOptions {
    /**
     * Custom client name to identify the application using the SDK
     */
    clientName?: string;
    /**
     * Custom client version to identify the version of the application using the SDK
     */
    clientVersion?: string;
}

/**
 * Client for the Balancer API that handles making GraphQL requests
 * with proper client headers. Works in both browser and Node.js
 * environments.
 */
export class BalancerApiClient {
    /** The URL of the Balancer API endpoint */
    apiUrl: string;
    /** The blockchain chain ID */
    chainId: ChainId;
    /** The name of the client application using the SDK */
    clientName: string;
    /** The version of the client application using the SDK */
    clientVersion: string;

    /**
     * Create a new Balancer API client
     *
     * @param apiUrl The URL of the Balancer API endpoint
     * @param chainId The chain ID
     * @param options Optional client configuration
     */
    constructor(
        apiUrl: string,
        chainId: ChainId,
        options?: BalancerApiClientOptions,
    ) {
        this.apiUrl = apiUrl;
        this.chainId = chainId;

        // Handle clientName with proper environment detection
        if (options?.clientName) {
            this.clientName = options.clientName;
        } else if (
            typeof process !== 'undefined' &&
            process?.env?.BALANCER_SDK_CLIENT_NAME
        ) {
            this.clientName =
                process.env.BALANCER_SDK_CLIENT_NAME || 'balancer-sdk';
        } else if (
            typeof window !== 'undefined' &&
            (window as WindowWithConfig).BALANCER_SDK_CLIENT_NAME
        ) {
            this.clientName =
                (window as WindowWithConfig).BALANCER_SDK_CLIENT_NAME ||
                'balancer-sdk';
        } else {
            this.clientName = 'balancer-sdk';
        }

        // Handle clientVersion with proper environment detection
        if (options?.clientVersion) {
            this.clientVersion = options.clientVersion;
        } else if (
            typeof process !== 'undefined' &&
            process?.env?.BALANCER_SDK_CLIENT_VERSION
        ) {
            this.clientVersion =
                process.env.BALANCER_SDK_CLIENT_VERSION || '0.0.0';
        } else if (
            typeof window !== 'undefined' &&
            (window as WindowWithConfig).BALANCER_SDK_CLIENT_VERSION
        ) {
            this.clientVersion =
                (window as WindowWithConfig).BALANCER_SDK_CLIENT_VERSION ||
                '0.0.0';
        } else {
            // Handle the case when __PACKAGE_VERSION__ is not defined (e.g., in tests)
            this.clientVersion =
                typeof __PACKAGE_VERSION__ !== 'undefined'
                    ? __PACKAGE_VERSION__
                    : '0.0.0';
        }
    }

    async fetch(requestQuery: {
        operationName?: string;
        query: string;
        variables?: Record<string, string | boolean | string[] | number>;
    }) {
        const response = await fetch(this.apiUrl, {
            method: 'post',
            body: JSON.stringify(requestQuery),
            headers: {
                'Content-Type': 'application/json',
                ChainId: this.chainId.toString(),
                'x-graphql-client-name': this.clientName,
                'x-graphql-client-version': this.clientVersion,
            },
        });
        return response.json();
    }
}
