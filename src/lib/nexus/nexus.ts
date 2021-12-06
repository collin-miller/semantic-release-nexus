import axios, { AxiosRequestConfig } from 'axios';
import Debug from 'debug';
import FormData from 'form-data';
import fs from 'fs';
import { INexusOptions, DEFAULT_NEXUS_OPTIONS } from './nexus.options';

const debug = Debug('nexus');

export default class Nexus {
    /**
     * options getter
     */
    public get options(): INexusOptions {
        return this.nexusOptions;
    }

    /**
     * options setter
     */
    public set options(options: INexusOptions) {
        this.nexusOptions = Object.assign({} as INexusOptions, DEFAULT_NEXUS_OPTIONS, options);
    }

    /**
     * constructor
     */
    constructor(public host: string = 'localhost', private nexusOptions: INexusOptions = {} as INexusOptions) {
        this.options = nexusOptions;
    }

    /**
     * deploy
     */
    public async deploy(repo: string, artifactName: string, artifactPath: string): Promise<void> {
        let config = {} as AxiosRequestConfig;
        const form = new FormData();

        form.append(artifactName, fs.createReadStream(artifactPath));
        config = {
            data: form,
            headers: form.getHeaders(),
        };
        if (this.options.username && this.options.password) {
            config.auth = { username: this.options.username, password: this.options.password };
        }
        try {
            await axios.post(`${this.host}/repository/${repo}`, config);
        } catch (error) {
            debug('%o', error);
            throw error;
        }
    }
}
