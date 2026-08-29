declare global {
    namespace ioBroker {
        interface AdapterConfig {
            email: string;
            password: string;
            countryCode: string;
            region: string;
            homeIndex: number;
            pollInterval: number;
            defaultDuration: number;
        }
    }
}

export {};
