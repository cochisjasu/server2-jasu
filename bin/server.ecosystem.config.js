module.exports = {
    apps: [{
        script: './server.js',
        watch: '.',
        name: 'jasu-server',
        instances: 4,
        env: {
            NODE_ENV: 'production',
            PORT: '4121'
        }
    }
    ]
};
