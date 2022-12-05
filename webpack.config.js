// Generated using webpack-cli https://github.com/webpack/webpack-cli

const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

const isProduction = process.env.NODE_ENV === 'dev';


const config = {
    entry: [
        './test/ArrayUtilsTest.ts',
        './test/BubbleMessageTest.ts',
        './test/ClientAppTest.ts',
        './test/CommandMapperTest.ts',
        './test/ContextTest.ts',
        './test/DisposableTest.ts',
        './test/EnumTest.ts',
        './test/FactoryTest.ts',
        './test/GenericTypesTest.ts',
        './test/HierarchyObjectContainerTest.ts',
        './test/HierarchyObjectTest.ts',
        './test/MessageDispatcherTest.ts',
    ],
    devtool: 'inline-source-map',
    output: {
        path: path.resolve(__dirname, 'dist_client'),
    },
    optimization: {
        usedExports: true
    },
    devServer: {
        open: true,
        host: 'localhost'
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: 'index.ejs',
            inject: false
        }),
        new CopyPlugin({
            patterns: [
                {
                    from: "dev.json",
                    to: "./"
                },
            ],
        }),
    ],
    module: {
        rules: [
            {
                test: /\.(ts|tsx)$/i,
                loader: 'ts-loader',
                options: {
                    configFile: "tsconfig.json"
                }
            },
            {
                test: /\.(eot|svg|ttf|woff|woff2|png|jpg|gif)$/i,
                type: 'asset'
            }

            // Add your rules for custom modules here
            // Learn more about loaders from https://webpack.js.org/loaders/
        ],
    },
    ignoreWarnings: [/Failed to parse source map/],
    resolve: {
        extensions: ['.tsx', '.ts', '.jsx', '.js', '...'],
    },
};

module.exports = () => {
    if (isProduction) {
        config.mode = 'production';
    } else {
        config.mode = 'development';
    }
    return config;
};
