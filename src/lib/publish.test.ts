import { afterEach, describe, expect, it, jest } from '@jest/globals';
import AggregateError from 'aggregate-error';
import glob from 'tiny-glob';
import Nexus from './nexus';
import { publish } from './publish';

jest.mock('tiny-glob');
jest.mock('./nexus');

describe('publish', () => {
    const mockedNexus = Nexus as jest.MockedClass<typeof Nexus>;
    const mockedGlob = glob as jest.Mocked<typeof glob>;

    afterEach(() => {
        jest.resetAllMocks();
    });
    it('should successfully publish', async () => {
        (mockedGlob as jest.Mock)
            .mockImplementationOnce(() => ['dist/some-package-v1.tar.gz'])
            .mockImplementationOnce(() => ['dist/other-package-v2.tar.gz'])
            .mockImplementationOnce(() => ['dist/some-package-v1.tar.gz'])
            .mockImplementationOnce(() => ['dist/other-package-v2.tar.gz']);

        const mockedDeploy = jest.fn().mockImplementation(() => Promise.resolve(null));
        (mockedNexus as jest.Mock).mockImplementationOnce(() => {
            return {
                deploy: mockedDeploy,
            };
        });
        const logMock = jest.fn();
        await expect(
            publish(
                {
                    nexusHost: 'localhost',
                    nexusPath: 'some-repo',
                    assets: [
                        { path: 'dist/some-package-*.tar.gz' },
                        { path: 'dist/other-package-*.tar.gz', name: 'artifact-2' },
                    ],
                },
                { logger: { log: logMock, error: jest.fn() }, env: {} },
            ),
        ).resolves.toBeUndefined();
        expect(logMock).toBeCalledTimes(4);
        expect(logMock.mock.calls).toMatchSnapshot();
        expect(mockedDeploy).toBeCalledTimes(2);
        expect(mockedDeploy).toHaveBeenNthCalledWith(
            1,
            'some-repo',
            'some-package-v1.tar.gz',
            'dist/some-package-v1.tar.gz',
        );
        expect(mockedDeploy).toHaveBeenNthCalledWith(2, 'some-repo', 'artifact-2', 'dist/other-package-v2.tar.gz');
        expect(mockedNexus).toHaveBeenCalledTimes(1);
        expect(mockedNexus.mock.calls).toMatchSnapshot();
    });

    it('should successfully publish w/ auth', async () => {
        const mockedDeploy = jest.fn().mockImplementation(() => Promise.resolve(null));
        (mockedNexus as jest.Mock).mockImplementationOnce(() => {
            return {
                deploy: mockedDeploy,
            };
        });
        const logMock = jest.fn();
        (mockedGlob as jest.Mock)
            .mockImplementationOnce(() => ['dist/some-package-v1.tar.gz'])
            .mockImplementationOnce(() => ['dist/other-package-v2.tar.gz'])
            .mockImplementationOnce(() => ['dist/some-package-v1.tar.gz'])
            .mockImplementationOnce(() => ['dist/other-package-v2.tar.gz']);
        await expect(
            publish(
                {
                    nexusHost: 'localhost',
                    nexusPath: 'some-repo',
                    assets: [
                        { path: 'dist/some-package-*.tar.gz' },
                        { path: 'dist/other-package-*.tar.gz', name: 'artifact-2' },
                    ],
                },
                {
                    logger: { log: logMock, error: jest.fn() },
                    env: { NX_USER: 'some-user', NX_PASSWORD: 'some-password' },
                },
            ),
        ).resolves.toBeUndefined();
        expect(logMock).toBeCalledTimes(4);
        expect(logMock.mock.calls).toMatchSnapshot();
        expect(mockedDeploy).toBeCalledTimes(2);
        expect(mockedDeploy).toHaveBeenNthCalledWith(
            1,
            'some-repo',
            'some-package-v1.tar.gz',
            'dist/some-package-v1.tar.gz',
        );
        expect(mockedDeploy).toHaveBeenNthCalledWith(2, 'some-repo', 'artifact-2', 'dist/other-package-v2.tar.gz');
        expect(mockedNexus).toHaveBeenCalledTimes(1);
        expect(mockedNexus.mock.calls).toMatchSnapshot();
    });

    it('should raise exception when publish fails', async () => {
        const mockedDeploy = jest
            .fn()
            .mockImplementationOnce(() => Promise.resolve(null))
            .mockImplementationOnce(() => Promise.reject(Error('I hate you')));
        (mockedNexus as jest.Mock).mockImplementationOnce(() => {
            return {
                deploy: mockedDeploy,
            };
        });
        (mockedGlob as jest.Mock)
            .mockImplementationOnce(() => ['dist/some-package-v1.tar.gz'])
            .mockImplementationOnce(() => ['dist/other-package-v2.tar.gz'])
            .mockImplementationOnce(() => ['dist/some-package-v1.tar.gz'])
            .mockImplementationOnce(() => ['dist/other-package-v2.tar.gz']);
        const logMock = jest.fn();
        const errorMock = jest.fn();
        await expect(
            publish(
                {
                    nexusHost: 'localhost',
                    nexusPath: 'some-repo',
                    assets: [{ path: 'dist/some-package-*.tar.gz' }, { path: 'dist/other-package-*.tar.gz' }],
                },
                { logger: { log: logMock, error: errorMock }, env: {} },
            ),
        ).rejects.toThrowError(AggregateError);
        expect(logMock).toBeCalledTimes(4);
        expect(logMock.mock.calls).toMatchSnapshot();
        expect(errorMock).toBeCalledTimes(1);
        expect(errorMock.mock.calls).toMatchSnapshot();
        expect(mockedDeploy).toBeCalledTimes(2);
        expect(mockedDeploy).toHaveBeenNthCalledWith(
            1,
            'some-repo',
            'some-package-v1.tar.gz',
            'dist/some-package-v1.tar.gz',
        );
        expect(mockedDeploy).toHaveBeenNthCalledWith(
            2,
            'some-repo',
            'other-package-v2.tar.gz',
            'dist/other-package-v2.tar.gz',
        );
        expect(mockedNexus).toHaveBeenCalledTimes(1);
        expect(mockedNexus.mock.calls).toMatchSnapshot();
    });
});
