module.exports = function () {

    var config = {
        defaultUser: 'default@user.com',
        defaultSpace: 'dev',
        prodSpace: 'Production',
        bxPath: {
            app: 'mybxgulp-app',
            domain: 'mybluemix.net',
            org: 'myorg',
            acctID: 'myaccountid'
        },
        manifest: {
            dev: {
                memory: '256M',
                instances: '1',
                disk_quota: '256M'
            },
            prod: {
                memory: '256M',
                instances: '1',
                disk_quota: '256M'
            }
        }
    };

    return config;
};
