import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {ChakraProvider, theme, Box, HStack, Flex, Button, Text, VStack, Center,
    FormLabel,  FormControl, Input, Divider, Alert, AlertDescription, AlertIcon,
    RadioGroup, Radio, Stack, Tooltip
 } from '@chakra-ui/react';
import { PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';
import { deserialize, serialize } from 'borsh';
import { isMobile } from "react-device-detect";
import SyntaxHighlighter from 'react-syntax-highlighter';
import { docco } from 'react-syntax-highlighter/dist/esm/styles/hljs';

import * as web3 from '@solana/web3.js';

import {
    ConnectionProvider,
    WalletProvider,
    useConnection,
    useWallet,
} from '@solana/wallet-adapter-react';
import {
    getPhantomWallet,
    getSolflareWallet,
    getSolletWallet,
    getSolletExtensionWallet,
} from '@solana/wallet-adapter-wallets';
import {
    WalletModalProvider,
    WalletMultiButton,
    WalletDisconnectButton,
} from '@solana/wallet-adapter-react-ui';
require('@solana/wallet-adapter-react-ui/styles.css');

const PROGRAM_KEY = new PublicKey('49Ee36zLEqpLQeCmtE7HP5kki1ok6dRyjhvdsiYc9xrq');   
const SYSTEM_PROGRAM_ID = new PublicKey('11111111111111111111111111111111'); 


const VerifyInstruction = {
    submit_program : 0,
    verify_program : 1
}


const VerifyNetwork = {
    test_net : 0,
    dev_net : 1,
    main_net : 2
}


class Assignable {
    constructor(properties) {
      Object.keys(properties).map((key) => {
        return (this[key] = properties[key]);
      });
    }
  }
  
class SubmitMeta extends Assignable { }
class ProgramMeta extends Assignable { }

class my_u8 extends Assignable { }
class my_u8_array extends Assignable { }

const program_meta_schema = new Map([
    [ProgramMeta, { kind: 'struct', 
    fields: [
        ['test_address', [32]],
        ['last_verified_slot', 'u64'],
        ['verified_code', 'u8'],
        ['data_hash', [32]]
    ] 
    }]
]);

const submit_schema = new Map([
    [SubmitMeta, { kind: 'struct', 
    fields: [
        ['instruction', 'u8'],
        ['address', [32]],
        ['network', 'u8'],
        ['git_repo', 'string'],
        ['git_commit', 'string'],
        ['directory', 'string'],
        ['docker_version', 'string'],
        ['rust_version', 'string'],
        ['solana_version', 'string'],
        ['anchor_version', 'string']
    ] 
    }]
]);

const u8_scheme = new Map([
    [my_u8, { kind: 'struct', 
    fields: [
    ['value', 'u8']] }]
]);

const u8_array_scheme = new Map([
    [my_u8_array, { kind: 'struct', 
    fields: [
    ['value', [255]]] }]
]);


function WalletNotConnected() 
{
    return (
        <Box mb  = "10px"  mt = "1rem">
            
            <Center>
                    <WalletMultiButton />
            </Center>

        </Box>
    );
}

function WalletConnected() 
{

    return (
        <Box mb  = "10px"  mt = "1rem">
             
            <Center>
                    <WalletDisconnectButton />
               
            </Center>
        </Box>
    );
}




export function AccountInfo() 
{
    const wallet = useWallet();
    return (
      <>
       {wallet.publicKey &&  
          
          <WalletConnected/>
      
      }


        {!wallet.publicKey && <WalletNotConnected />}
        
        </>
    );
}


function CustomEnvBlock({rust_version, solana_version, anchor_version})
{

    let anchor_string = `RUN cargo install --git https://github.com/project-serum/anchor --tag v`  + anchor_version + ` anchor-cli --locked`;
    if (anchor_version === "") {
        anchor_string = "";
    }
    return(
        <Flex>
                
            <VStack>
            <SyntaxHighlighter language="text" style={docco}>
{
`FROM rust:`+rust_version+`

RUN sh -c "$(curl -sSL https://release.solana.com/v`+solana_version+`/install)"
ENV PATH="\${PATH}:/root/.local/share/solana/install/active_release/bin"
`
+
anchor_string
+
`
RUN solana config set --url https://api.devnet.solana.com`
}
            </SyntaxHighlighter>
            </VStack>
                
            
            
        </Flex>
    );
}

let logintervalId;

function MainFunction()
{
    const [log_message, setLogMessage] = useState(null);
    const [status_code, setStatusCode] = useState(null);
    const [verified_code, setVerifiedCode] = useState(null);

    const [program_address, setAddress] = React.useState("")
    const [git_repo, setGitRepo] = React.useState("")
    const [git_commit, setGitCommit] = React.useState("")
    const [directory, setDirectory] = React.useState("")

    const [run_status, setRunStatus] = React.useState(0)


    const [network_radio, setNetworkRadio] = React.useState('DevNet')


    const [rust_version, setRustVersion] = React.useState("1.63")
    const [solana_version, setSolanaVersion] = React.useState("1.10.39")
    const [anchor_version, setAnchorVersion] = React.useState("0.25.0")

    const wallet = useWallet();
    const { connection }  = useConnection();

    const handleAddressChange = (e) => setAddress(e.target.value);
    const handleGitRepoChange = (e) => setGitRepo(e.target.value);
    const handleGitCommitChange = (e) => setGitCommit(e.target.value);
    const handleDirectoryChange = (e) => setDirectory(e.target.value);     

    const handleRustVersionChange = (e) => setRustVersion(e.target.value);
    const handleSolanaVersionChange = (e) => setSolanaVersion(e.target.value);
    const handleAnchorVersionChange = (e) => setAnchorVersion(e.target.value);

     
    const init = useCallback(async () => 
    {       
        if (wallet.publicKey) {

            let user_meta_key = (await PublicKey.findProgramAddress([wallet.publicKey.toBytes(), "user_account"], PROGRAM_KEY))[0];

            let user_data_account = null;
            
            try {
                user_data_account = await connection.getAccountInfo(user_meta_key);
            }
            catch(error) {
                console.log(error);
            }

            if (user_data_account != null) {

                const status_code_struct = deserialize(u8_scheme, my_u8, user_data_account.data.slice(0,1));
                const log_len_struct = deserialize(u8_scheme, my_u8, user_data_account.data.slice(1,2));
                const log_array_struct = deserialize(u8_array_scheme, my_u8_array, user_data_account.data.slice(2,257));
                const uint8array = log_array_struct.value.slice(0,log_len_struct.value);

                //console.log("status code ", status_code_struct.value);
                //console.log("log len ", log_len_struct.value);

                var string = new TextDecoder().decode(uint8array);
                //console.log("string ", string);
                //console.log("status_code ", status_code_struct.value);

                setStatusCode(status_code_struct.value);
                setLogMessage(string);

                let program_address_to_use = program_address;

                if (program_address === ""){
                    program_address_to_use = string.split(/\s+/)[1];
                }
                try {

                    let test_program_key = new web3.PublicKey(program_address_to_use)
                    let network_string = "dev_net";
    
                    //console.log(network_radio);
                    if (network_radio === "TestNet") {
                        network_string = "test_net";
                    }
                    else if (network_radio === "MainNet") {
                        network_string = "main_net";
                    }

                    let program_meta_key = (await PublicKey.findProgramAddress([test_program_key.toBytes(), network_string], PROGRAM_KEY))[0];

                    let program_data_account = await connection.getAccountInfo(program_meta_key);

                    const program_data = deserialize(program_meta_schema, ProgramMeta, program_data_account.data);

                    //console.log("interval ", program_data.verified_code, network_string);

                    setVerifiedCode(program_data.verified_code);
                }
                catch(error) {
                    setVerifiedCode(null);
                }  
                
            }
        }
    }, [wallet, connection, program_address, network_radio]);

    useEffect(() => 
    {
        if (wallet.publicKey && !logintervalId) {
            logintervalId = setInterval(init, 1000);
        }
        else{
            clearInterval(logintervalId);
            logintervalId = null;
        }
    }, [init, wallet]); 

    const check_status = useCallback( async () => 
    {
        
        
        let program_key = new web3.PublicKey(program_address);
        let network_string = "dev_net";

        if (network_radio === "TestNet") {
            network_string = "test_net";
        }
        else if (network_radio === "MainNet") {
            network_string = "main_net";
        }

        let program_meta_account = (await PublicKey.findProgramAddress([program_key.toBytes(), network_string], PROGRAM_KEY))[0];


        try {
            let program_data_account = await connection.getAccountInfo(program_meta_account);

            const program_data = deserialize(program_meta_schema, ProgramMeta, program_data_account.data);
    
            //console.log("have code ", program_data.verified_code);
            setVerifiedCode(program_data.verified_code);

        } catch(error) {
            setVerifiedCode(100);
            console.log(error);
        }

        setRunStatus(1);
        
    },
    [connection, program_address, network_radio]
    );


    const register_user = useCallback( async () => 
    {
        

        let program_key = new web3.PublicKey(program_address);
        let network_string = "dev_net";

        console.log(network_radio);
        let network = VerifyNetwork.dev_net;
        if (network_radio === "TestNet") {
            network = VerifyNetwork.test_net;
            network_string = "test_net";
        }
        else if (network_radio === "MainNet") {
            network = VerifyNetwork.main_net;
            network_string = "main_net";
        }

        let program_meta_account = (await PublicKey.findProgramAddress([program_key.toBytes(), network_string], PROGRAM_KEY))[0];
        let user_meta_account = (await PublicKey.findProgramAddress([wallet.publicKey.toBytes(), "user_account"], PROGRAM_KEY))[0];

        console.log(rust_version, solana_version, anchor_version);
        const instruction_data = new SubmitMeta(
            { 
                instruction: VerifyInstruction.submit_program,
                address: program_key.toBytes(),
                network : network,
                git_repo: git_repo,
                git_commit: git_commit,
                directory: directory,
                docker_version:  "",
                rust_version:  rust_version,
                solana_version: solana_version,
                anchor_version: anchor_version
            }
        );

        const data = serialize(submit_schema, instruction_data);

        const submit_instruction = new TransactionInstruction({
            keys: [
                {pubkey: wallet.publicKey, isSigner: true, isWritable: true},
                {pubkey: program_meta_account, isSigner: false, isWritable: true},
                {pubkey: user_meta_account, isSigner: false, isWritable: true},

                
                {pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false}

            ],
            programId: PROGRAM_KEY,
            data: data
        });

        let transaction = new Transaction();
      
        transaction.add(submit_instruction);

            try {
                await wallet.sendTransaction(
                transaction,
                connection
                );

        } catch(error) {
            console.log(error);
        }



    },
    [connection, wallet, program_address, git_repo, git_commit, directory, rust_version, solana_version, anchor_version, network_radio]
    );

    return(

        <Center>
        <Flex w="100%" ml = "2rem" mr = "2rem" mt="2rem" flexDirection="column">

                
        <Box mb="2rem"  p="1rem">
            <Center>
            <HStack>
                
                <Text  mr="2rem" fontSize="2rem"  textAlign="center">SolVerified</Text>
                <AccountInfo/>
            </HStack>
            </Center>
            
        </Box>

        <Box borderWidth='2px' borderRadius="2rem" p="1rem">
            {wallet.publicKey &&   
            <>
                <>
                

                <Text  mb="1rem" fontSize="1rem"  textAlign="left"><br/>To verify your program, enter the required data below and click Verify.  It may take up to 15 minutes for verification to complete.  </Text>
                </>
                
 
                    <VStack align="left" spacing="1rem">

                        <Text  fontSize="1.5rem"  textAlign="left"><b>Your Program</b>  </Text>
                        <Text  fontSize="1rem"  textAlign="left">Select the network your program has been deployed to, and enter its address on-chain.  </Text>

                        <Box>
                            <RadioGroup onChange={setNetworkRadio} value={network_radio}>
                                <Stack direction='row'>
                                    <Box><Radio value='TestNet'>Testnet</Radio></Box>
                                    <Box><Radio value='DevNet'>Devnet</Radio></Box>
                                    <Box><Radio value='MainNet'>Mainnet</Radio></Box>
                                </Stack>
                            </RadioGroup>
                        </Box>

                        <HStack>
                            <FormControl  mb = "1rem" id="program_address" maxWidth={"450px"}>
                                <FormLabel>Program Address</FormLabel>
                                <Input
                                    type="text"
                                    value={program_address}
                                    onChange={handleAddressChange}
                                    
                                />
                        
                            </FormControl>

                        
                        </HStack>
                        {  run_status === 1 &&
                            <>
                            {

                            verified_code === 100 ?

                            <Alert status='error'>
                                    <AlertIcon />
                                    <AlertDescription>Verification process has not been started</AlertDescription>
                            </Alert>

                            :

                            verified_code === 1 ?

                            <>
                                <Alert status='error'>
                                    <AlertIcon />
                                    <AlertDescription>Verification process has not produced a match</AlertDescription>
                                </Alert>

                            </>

                            :

                            verified_code === 2 ?

                            <>
                                <Alert status='warning'>
                                    <AlertIcon />
                                    <AlertDescription>Verification was successful, however the program is updatable</AlertDescription>
                                </Alert>

                            </>
                            :

                            verified_code === 3 ?

                            <>
                                <Alert status='success'>
                                    <AlertIcon />
                                    <AlertDescription>Program verified and immutable!</AlertDescription>
                                </Alert>

                            </>

                            :

                            verified_code === 0 ?
                                <Alert status='info'>
                                    <AlertIcon />
                                    <AlertDescription>Verification is underway</AlertDescription>
                                </Alert>
                            :

                            <></>

                            }
                            </>
                        }

                        <Button onClick={check_status} mb = "2rem"  mr = "1rem" width='150px' colorScheme='green' variant='solid'>
                        Check Status
                        </Button>

                        <Divider/>

                        <Text  fontSize="1.5rem"  textAlign="left"><b>Your Build Environment</b>  </Text>
                        <Text  fontSize="1rem"  textAlign="left"> Input details of your build environment.  SolVerified will build a docker image using the dockerfile displayed below.  </Text>

                        <VStack align="left">
                        <HStack>
                        <Tooltip hasArrow label='cargo --version'>
                            <FormControl  mb = "1rem" mt = "1rem" id="rust_version" maxWidth={"200px"}>
                                
                                <FormLabel>Rust version</FormLabel>
                                <Input
                                    type="text"
                                    value={rust_version}
                                    onChange={handleRustVersionChange}
                                    
                                />
                        
                            </FormControl>
                            </Tooltip>
                            <Tooltip hasArrow label='solana --version'>
                            <FormControl  mb = "1rem" mt = "1rem" id="solana_version" maxWidth={"200px"}>
                                <FormLabel>Solana Version</FormLabel>
                                <Input
                                    type="text"
                                    value={solana_version}
                                    onChange={handleSolanaVersionChange}
                                    
                                />
                        
                            </FormControl>
                            </Tooltip>
                            <Tooltip hasArrow label="anchor --version (leave blank if you don't use anchor)">
                            <FormControl  mb = "1rem" mt = "1rem" id="anchor_version" maxWidth={"200px"}>
                                <FormLabel>Anchor Version</FormLabel>
                                <Input
                                    type="text"
                                    value={anchor_version}
                                    onChange={handleAnchorVersionChange}
                                    
                                />
                        
                            </FormControl>
                            </Tooltip>
                        </HStack>
                        <CustomEnvBlock rust_version={rust_version}  solana_version={solana_version} anchor_version={anchor_version}/>
                        </VStack>
                        


                        <Divider/>

                        <Text  fontSize="1.5rem"  textAlign="left"><b>Your Code</b>  </Text>
                        <Text  fontSize="1rem"  textAlign="left">SolVerified currently only supports git repositories. <br/> Provide the link to the git repo, the commit to build, and the directory within where the build occurs.  If this is the root directory just enter / </Text>

                        <HStack>
                            <FormControl  mb = "1rem" mt = "1rem" id="git_repo" maxWidth={"300px"}>
                                <FormLabel>Git Repo</FormLabel>
                                <Input
                                    type="text"
                                    value={git_repo}
                                    onChange={handleGitRepoChange}
                                    
                                />
                        
                            </FormControl>
                            <FormControl  mb = "1rem" mt = "1rem" id="git_commit" maxWidth={"300px"}>
                                <FormLabel>Git Commit</FormLabel>
                                <Input
                                    type="text"
                                    value={git_commit}
                                    onChange={handleGitCommitChange}
                                    
                                />
                        
                            </FormControl>
                            <FormControl  mb = "1rem" mt = "1rem" id="directory" maxWidth={"300px"}>
                                <FormLabel>Directory</FormLabel>
                                <Input
                                    type="text"
                                    value={directory}
                                    onChange={handleDirectoryChange}
                                    
                                />
                        
                            </FormControl>
                        </HStack>
                    
                    {(directory === "" || git_commit === "" || git_repo === "" ||  program_address === "" || rust_version === "" || solana_version === "") ?
                    <Button  disabled onClick={register_user} mb = "2rem"  mr = "1rem" width='150px' colorScheme='green' variant='solid'>
                        Verify
                    </Button>

                    :
                    <Button onClick={register_user} mb = "2rem"  mr = "1rem" width='150px' colorScheme='green' variant='solid'>
                        Verify
                    </Button>

                    }

                    </VStack>


                    <Divider mb="1rem" mt = "1rem"/>



                        
                    {verified_code === 0 || verified_code == null?
                    <></>

                    :

                    verified_code === 1 ?

                    <>
                        <Alert status='error'>
                            <AlertIcon />
                            <AlertDescription>Verification process has not produced a match</AlertDescription>
                        </Alert>
                        <Divider mb="1rem" mt = "1rem"/>

                    </>

                    :

                    verified_code === 2 ?

                    <>
                        <Alert status='warning'>
                            <AlertIcon />
                            <AlertDescription>Verification was successful, however the program is updatable</AlertDescription>
                        </Alert>
                        <Divider mb="1rem" mt = "1rem"/>

                    </>

                    :

                    <>
                        <Alert status='success'>
                            <AlertIcon />
                            <AlertDescription>Program verified and immutable!</AlertDescription>
                        </Alert>
                        <Divider mb="1rem" mt = "1rem"/>

                    </>

                    }
                    

                    

                    <Box mt = "2rem">
                        {log_message == null ?
                            <span id="log_span"> Waiting to start verification.  Progress will be updated here. <br /><br /><br /><br /><br /></span>
                        :

                        status_code >= 100 ?
                            <Alert status='error'>
                                <AlertIcon />
                                <AlertDescription>{log_message}</AlertDescription> 
                            </Alert>

                          
                        :

                        <span id="log_span"> 
                            {log_message} <br /><br /><br /><br /><br />
                        </span>

                        }
                        

                    </Box>

                   
                
            </>
            
            }
            {!wallet.publicKey &&   <Text p = "4rem" fontSize="2rem"  textAlign="center">Connect A Solana Wallet To Verify A Program</Text>}
        </Box>  
        

        
        
        </Flex>
        </Center>
    );
}

function Verified()
{
    const network = 'devnet';
    const endpoint = web3.clusterApiUrl(network);
    const wallets = useMemo(() => 
    [
        getPhantomWallet(),
        getSolflareWallet(),
        getSolletWallet({ network }),
        getSolletExtensionWallet({ network }),
    ],
    [network]
    );


    return(
        <ChakraProvider theme={theme}>
            <ConnectionProvider endpoint={endpoint}>
                <WalletProvider wallets={wallets} autoConnect>
                    <WalletModalProvider>

                        {!isMobile &&
                            <MainFunction/>
                        }
                        {isMobile &&
                            <Text  fontSize="1rem"  textAlign="left"><br/>Rewards Program currently doesn't support mobile use </Text>
                        }
       
                    </WalletModalProvider>
                </WalletProvider>
            </ConnectionProvider>
        </ChakraProvider>

    );
}

export default Verified;