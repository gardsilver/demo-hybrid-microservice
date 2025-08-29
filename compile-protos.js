const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);

const mode = args?.length> 0 ?args[0].trim().toLocaleLowerCase() : 'lunix';

if (!['win', 'lunix'].includes(mode)) {
    throw Error(`Unknown system (${mode}). Use "lunix" or "win".`);
}

const DIST_DIR = 'protos/compiled/';
const PROTO_SOURCES = [
    'protos',
];
const PROTO_TO_COMPILE = [
    'protos/demo/service/MainService.proto',
    'protos/google/protobuf/timestamp.proto',
    'protos/google/type/money.proto',
];

const COMPILE_PARAMS = [
    '--ts_proto_opt=nestJs=true',
    '--ts_proto_opt=outputServices=grpc-js',
    '--ts_proto_opt=addGrpcMetadata=true',
    '--ts_proto_opt=addNestjsRestParameter=true',
    '--ts_proto_opt=lowerCaseServiceMethods=true',
    '--ts_proto_opt=forceLong=long',
    '--ts_proto_opt=useDate=true',
 
];


function cleareCompiledDir() {
    fs.rmSync(path.join(__dirname, DIST_DIR), {
        recursive: true,
        force: true,
    });

    fs.mkdirSync(path.join(__dirname, DIST_DIR), {
        recursive: true,
        force: true,
    });
}

async function compileProtos() {
    return new Promise((resolve, reject) => {
        const includeDirs = PROTO_SOURCES
            .map( dir => `-I=${dir}`)
            .join(' ');

        const pluginPath = mode === 'win'
            ? '".\\node_modules\\.bin\\protoc-gen-ts_proto.cmd"'
            : './node_modules/.bin/protoc-gen-ts_proto';

        const comand =  `protoc --plugin=protoc-gen-ts_proto=${pluginPath}` +
        ` --ts_proto_out ${DIST_DIR}  ${COMPILE_PARAMS.join(' ')}  ${includeDirs}  ${PROTO_TO_COMPILE.join(' ')}`;
        
        const file = fs.openSync('log.log', 'a');
        fs.appendFileSync(file, comand + '\n', 'utf8')

        exec (
            comand,
            (error) => {
                if (error) {
                    fs.appendFileSync(file, error.message + '\n', 'utf8')

                    reject(error);
                    return;
                }
                resolve();
            }
        );

    });
}

(async () => {
    cleareCompiledDir();
    await compileProtos();
    console.log('\x1b[32m%s\x1b[0m', 'Proto compiled!')
})();