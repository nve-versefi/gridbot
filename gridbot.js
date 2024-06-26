import fetch from "node-fetch";
import inquirer from "inquirer";
import readline from "readline";
import fs from "fs/promises";
import chalk from "chalk";
import { Connection, Keypair, VersionedTransaction, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import dotenv from 'dotenv';
import { Wallet } from '@project-serum/anchor';
import axios from 'axios';
import { promisify } from 'util';



dotenv.config();
//read keypair and decode to public and private keys.
//const wallet = new Wallet(Keypair.fromSecretKey(bs58.decode(process.env.PRIVATE_KEY)));
const keyPair = Keypair.fromSecretKey(bs58.decode(process.env.PRIVATE_KEY));
const wallet = new Wallet(keyPair);
// Replace with the Solana network endpoint URL
const connection = new Connection(process.env.RPC_ENDPOINT, 'confirmed', {
    commitment: 'confirmed',
    timeout: 90000
});

//api request data for URL query on swaps
class Tokens {
    constructor(mintSymbol, vsTokenSymbol, price) {
        this.mintSymbol = mintSymbol;
        this.vsTokenSymbol = vsTokenSymbol;
        this.price = price;
    }
}

class PriceData {
    constructor(selectedTokenA) {
        this.selectedTokenA = selectedTokenA;
    }
}
class PriceDataB {
    constructor(selectedTokenB) {
        this.selectedTokenB = selectedTokenB;
    }
}

class PriceResponse {
    constructor(data, timeTaken) {
        this.data = data;
        this.timeTaken = timeTaken;
    }
}

//vars for user inputs

let gridSpread = 0.33;
let devFee = 0.01;
let fixedSwapVal = 0;
let slipTarget = 0.15;
let refreshTime = 5;
let startTime = process.hrtime();
//const usdcMintAddress = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

async function main() {
    const selectedTokenA = 'BROKIE';
    const selectedAddressA = '4neSyzJmcSWQF58DKHdo7FNzJDDKSgaaQqrzuSXS5U6g';
    const selectedDecimalsA = 6;

    const selectedTokenB = 'SOL';
    const selectedAddressB = 'So11111111111111111111111111111111111111112';
    const selectedDecimalsB = 9;

    console.log(`Selected Tokens: ${selectedTokenA} and ${selectedTokenB}`);
    console.log(`Selected Addresses: ${selectedAddressA} and ${selectedAddressB}`);

    let tokenAMintAddress = new PublicKey(selectedAddressA);
    let tokenBMintAddress = new PublicKey(selectedAddressB);


    let devFeeA;
    let devFeeB;
    let solDevFee = "CebibGKKY8ZAnZrFo7q5U8Wr9BswAKg2qWbdog13vRMR";
    let usdcDevFee = "9eXRZqjY3htAn1VJy3aaHGgMaBzgWpFvYDSZrufKxHa5";
    let msolDevFee = "CEPjU8AeGPan4TuzyCv7LKBSbUSKV3sEVfin4t22W1qh";
    let stsolDevFee = "7ahUp232krm79f9CV7iTWkCYvsdBAdVN8QzvWVco1eiy";
    let arbDevFee = "FJeCc3E4yn9fyJN7rY6wwVcjo19XNV9fNuy1Vh6tcbzQ";
    let usdtDevFee = "4CxNnXSxdVd6svVFLRTGZN1vwEuFcP7ALSCWYSkbR8ib";
    let validTokenA = false;
    let validTokenB = false;
    let start = new Date();
    

    while (true) {
        const question = [            
            {
                type: "input",
                name: "gridSpread",
                message: "What Grid Spread in Percent?",
                default: "0.33",
                validate: function (value) {
                    var valid = !isNaN(parseFloat(value));
                    return valid || "Please Enter A Number";
                },
                filter: Number
            },
            
            {
                type: "input",
                name: "devFee",
                message: "What Percentage Donation Fee would you like to set? - Default is 0.01%",
                default: '0.01',
                validate: function (value) {
                    var valid = !isNaN(parseFloat(value));
                    return valid || "Please Enter A Number"
                },
                filter: Number
            }            
        ];

        let answer = await inquirer.prompt(question);

        gridSpread = answer.gridSpread;
        devFee = (answer.devFee * 100);
        //* 100 is to get bps for queries
        
        const question2 =
            [
            {
                type: "input",
                name: "fixedSwapVal",
                message: `How much ${selectedTokenA} would you like to swap, per layer?`,
                validate: function (value) {
                    var valid = !isNaN(parseFloat(value));
                    return valid || "Please Enter A Number";
                },
                filter: Number
            },
            {
                type: "input",
                name: "slipTarget",
                message: "Acceptable Slippage %? - Default 0.15%",
                default: '0.15',
                validate: function (value) {
                    var valid = !isNaN(parseFloat(value));
                    return valid || "Please Enter A Number";
                },
                filter: Number
            },
            {
                type: "input",
                name: "refreshTime",                
                message: "What Refresh Time would you like? (Seconds) - Default 5 Seconds",
                default: '5',
                validate: function (value) {
                   var valid = !isNaN(parseFloat(value));
                   return valid || "Please Enter A Number";
                },
                filter: Number
                }
            ];

            let answer2 = await inquirer.prompt(question2);

            fixedSwapVal = answer2.fixedSwapVal;
            slipTarget = answer2.slipTarget;
            refreshTime = answer2.refreshTime;

        if (selectedTokenA === "SOL") {
            devFeeA = solDevFee;
        } else if (selectedTokenA === "USDC") {
            devFeeA = usdcDevFee;
        } else if (selectedTokenA === "USDT") {
            devFeeA = usdtDevFee;
        } else if (selectedTokenA === "mSOL") {
            devFeeA = msolDevFee;
        } else if (selectedTokenA === "stSOL") {
            devFeeA = stsolDevFee;
        } else if (selectedTokenA === "ARB") {
            devFeeA = arbDevFee;
        } else {
            devFeeA = "None";
        }
        if (selectedTokenB === "SOL") {
            devFeeB = solDevFee;
        } else if (selectedTokenB === "USDC") {
            devFeeB = usdcDevFee;
        } else if (selectedTokenB === "USDT") {
            devFeeB = usdtDevFee;
        } else if (selectedTokenB === "mSOL") {
            devFeeB = msolDevFee;
        } else if (selectedTokenB === "stSOL") {
            devFeeB = stsolDevFee;
        } else if (selectedTokenB === "ARB") {
            devFeeB = arbDevFee;
        } else {
            devFeeB = "None";
        }

            console.clear();
            
            console.log(`Selected Tokens: ${selectedTokenA} and ${selectedTokenB}`);
            console.log(`Selected Grid Spread: ${gridSpread}%`);
            //console.log(`Selected Developer Donation: ${devFee}%`);
            console.log(`Swapping ${fixedSwapVal} ${selectedTokenA} for ${selectedTokenB} per layer.`);
            console.log(`Slippage Target: ${slipTarget}%`)
            console.log("");            
            break;            
    }    
    refresh(selectedTokenA, selectedTokenB, start, selectedAddressA, selectedAddressB, wallet, tokenAMintAddress, tokenBMintAddress, selectedDecimalsA, selectedDecimalsB, devFee, devFeeA, devFeeB, currentPrice);
    setInterval(() => { refresh(selectedTokenA, selectedTokenB, start, selectedAddressA, selectedAddressB, wallet, tokenAMintAddress, tokenBMintAddress, selectedDecimalsA, selectedDecimalsB, devFee, devFeeA, devFeeB, currentPrice); }, refreshTime * 1000);
}

//Init Spread Calculation once and declare spreads
console.clear();
var gridCalc = true;
let usdCalcStartA, usdCalcStartB, usdCalcNowA, usdCalcNowB, usdCalcChange;
let spreadUp, spreadDown, spreadIncrement;
let tokenABalanceStart, tokenBBalanceStart, tokenABalanceNow, tokenBBalanceNow, accountBalUSDStart, accountBalUSDCurrent;
let tokenABalanceStartSol, tokenBBalanceStartSol;
let buyOrders, sellOrders;
var currentPrice;
var lastPrice;
var direction;
let userPercentageChange;
let percentageChange;
let tokenAStart;

async function refresh(selectedTokenA, selectedTokenB, start, selectedAddressA, selectedAddressB, wallet, tokenAMintAddress, tokenBMintAddress, selectedDecimalsA, selectedDecimalsB, devFee, devFeeA, devFeeB, currentPrice) { 
    const apiUrl = `https://price.jup.ag/v4/price?ids=${selectedAddressA}&vsToken=${selectedAddressB}`;
console.log("API URL:", apiUrl);
const response = await fetch(apiUrl);
    if (response.ok) {
        const data = await response.json();
        console.log("Response Data:", data);
        
        if (data.data[selectedAddressA]) {
            // Token exists in the response data, proceed with calculations
            const tokens = new Tokens(
                data.data[selectedAddressA].mintSymbol,
                data.data[selectedAddressA].vsTokenSymbol,
                data.data[selectedAddressA].price
            );
            const priceData = new PriceData(tokens);
            const priceResponse = new PriceResponse(priceData, data.timeTaken);
            const endTime = new Date();
            const elapsedMilliseconds = endTime.getTime() - start.getTime();
            const elapsedSeconds = Math.floor(elapsedMilliseconds / 1000);
            const elapsedMinutes = Math.floor(elapsedSeconds / 60);
            const elapsedHours = Math.floor(elapsedMinutes / 60);
            const elapsedDays = Math.floor(elapsedHours / 24);
            const seconds = elapsedSeconds % 60;
            const minutes = elapsedMinutes % 60;
            const hours = elapsedHours % 24;
            const timeString = `${elapsedDays} days, ${hours} hours, ${minutes} minutes, ${seconds} seconds`;
            
            console.clear();
            console.log(`Gridbot Started at ${start.toLocaleString()}`);
            console.log(`Gridbot has been running for ${timeString}`);
            console.log("");
            console.log("Settings:");
            console.log(`Grid Width: ${gridSpread}%`);
            //console.log(`Developer Donation: ${devFee}%`);
            console.log(`Swapping ${fixedSwapVal}${selectedTokenA} per Grid`);
            console.log(`Maximum Slippage: ${slipTarget}%`);
            console.log("");

            //Create grid values
            if (gridCalc) {
                spreadDown = priceResponse.data.selectedTokenA.price * (1 - (gridSpread / 100));
                spreadUp = priceResponse.data.selectedTokenA.price * (1 + (gridSpread / 100));
                spreadIncrement = (priceResponse.data.selectedTokenA.price - spreadDown);
                currentPrice = priceResponse.data.selectedTokenA.price;
                lastPrice = priceResponse.data.selectedTokenA.price;
                buyOrders = 0;
                sellOrders = 0;

                //Get Start Balances
                if (selectedTokenA === "SOL") {                    
                    tokenABalanceStartSol = await connection.getBalance(wallet.publicKey);
                    tokenABalanceStart = tokenABalanceStartSol / 1000000000;
                    //console.log(`${selectedTokenA} Start Balance: ${tokenABalanceStart.toFixed(4)}`);
                } else {
                    const tokenAAccounts = await connection.getParsedTokenAccountsByOwner(wallet.publicKey, { mint: tokenAMintAddress });
                    if (tokenAAccounts && tokenAAccounts.value.length > 0) {
                        const tokenAAccountInfo = tokenAAccounts.value[0].account;
                        const tokenAAccount = tokenAAccountInfo.data.parsed.info;
                        tokenABalanceStart = tokenAAccount.tokenAmount.uiAmount;
                        //console.log(`${selectedTokenA} Start Balance: ${tokenABalanceStart.toFixed(4)}`);
                    } else {
                        console.log(chalk.red(`No token accounts found for ${selectedTokenA} in wallet ${wallet.publicKey}`));
                        process.exit(1);
                    }
                };

                if (selectedTokenB === "SOL") {
                    tokenBBalanceStartSol = await connection.getBalance(wallet.publicKey);
                    tokenBBalanceStart = tokenBBalanceStartSol / 1000000000;
                    //console.log(`${selectedTokenB} Start Balance: ${tokenBBalanceStart.toFixed(4)}`);
                } else {
                    const tokenBAccounts = await connection.getParsedTokenAccountsByOwner(wallet.publicKey, { mint: tokenBMintAddress });
                    if (tokenBAccounts && tokenBAccounts.value.length > 0) {
                        const tokenBAccountInfo = tokenBAccounts.value[0].account;
                        const tokenBAccount = tokenBAccountInfo.data.parsed.info;
                        tokenBBalanceStart = tokenBAccount.tokenAmount.uiAmount;
                        //console.log(`${selectedTokenB} Start Balance: ${tokenBBalanceStart.toFixed(4)}`);
                    } else {
                        console.log(chalk.red(`No token accounts found for ${selectedTokenB} in wallet ${wallet.publicKey}`));
                        process.exit(1);
                    }
                    await fetch(`https://price.jup.ag/v4/price?ids=${selectedAddressA}`)
                        .then(response => response.json())
                        .then(data => {
                            usdCalcStartA = data.data[selectedAddressA].price;
                        })
                        .catch(error => {
                            // handle errors
                            console.error(error);
                        });

                    await fetch(`https://price.jup.ag/v4/price?ids=${selectedAddressB}`)
                        .then(response => response.json())
                        .then(data => {
                            usdCalcStartB = data.data[selectedAddressB].price;
                        })
                        .catch(error => {
                            // handle errors
                            console.error(error);
                        });

                   
                };
                accountBalUSDStart = ((tokenABalanceStart.toFixed(selectedDecimalsA) * usdCalcStartA) + (tokenBBalanceStart.toFixed(selectedDecimalsB) * usdCalcStartB));
                gridCalc = false;
            }

            console.log(`USD Value Start: ${accountBalUSDStart.toFixed(4)}`);
            console.log(`${selectedTokenA} Start Balance: ${tokenABalanceStart.toFixed(selectedDecimalsA)}`);
            console.log(`${selectedTokenB} Start Balance: ${tokenBBalanceStart.toFixed(selectedDecimalsB)}`);
            console.log("");

            //Get current wallet data - Token A
            if (selectedTokenA === "SOL") {
                tokenABalanceNow = await connection.getBalance(wallet.publicKey) / 1000000000;
                console.log(`Current ${selectedTokenA} Balance: ${tokenABalanceNow.toFixed(selectedDecimalsA)}`);
            } else {
                const tokenAAccounts = await connection.getParsedTokenAccountsByOwner(wallet.publicKey, { mint: tokenAMintAddress });
                const tokenAAccountInfo = tokenAAccounts && tokenAAccounts.value[0] && tokenAAccounts.value[0].account;
                const tokenAAccount = tokenAAccountInfo.data.parsed.info;
                tokenABalanceNow = tokenAAccount.tokenAmount.uiAmount;
                console.log(`Current ${selectedTokenA} Balance: ${tokenABalanceNow.toFixed(selectedDecimalsA)}`);
            }
            //Get current wallet data - Token B
            if (selectedTokenB === "SOL") {
                tokenBBalanceNow = await connection.getBalance(wallet.publicKey) / 1000000000;
                console.log(`Current ${selectedTokenB} Balance: ${tokenBBalanceNow.toFixed(selectedDecimalsB)}`);
            } else {
                const tokenBAccounts = await connection.getParsedTokenAccountsByOwner(wallet.publicKey, { mint: tokenBMintAddress });
                const tokenBAccountInfo = tokenBAccounts && tokenBAccounts.value[0] && tokenBAccounts.value[0].account;
                const tokenBAccount = tokenBAccountInfo.data.parsed.info;
                tokenBBalanceNow = tokenBAccount.tokenAmount.uiAmount;
                console.log(`Current ${selectedTokenB} Balance: ${tokenBBalanceNow.toFixed(selectedDecimalsB)}`);
            }
            //get USD price for each asset
            //TO DO
            await fetch(`https://price.jup.ag/v4/price?ids=${selectedAddressA}`)
            .then(response => {
                console.log(`Fetching price for ${selectedTokenA}`);
                console.log(`URL: https://price.jup.ag/v4/price?ids=${selectedAddressA}`);
                return response.json();
            })
            .then(data => {
                if (data.data[selectedAddressA]) {
                    usdCalcNowA = data.data[selectedAddressA].price;
                    console.log(`Price of ${selectedTokenA}: ${usdCalcNowA}`);
                } else {
                    console.log(`Price data not found for ${selectedTokenA}`);
                }
            })
            .catch(error => {
                console.error(`Error fetching price for ${selectedTokenA}:`, error);
            });
        
        await fetch(`https://price.jup.ag/v4/price?ids=${selectedAddressB}`)
            .then(response => {
                console.log(`Fetching price for ${selectedTokenB}`);
                console.log(`URL: https://price.jup.ag/v4/price?ids=${selectedTokenB}`);
                return response.json();
            })
            .then(data => {
                if (data.data[selectedAddressB]) {
                    usdCalcNowB = data.data[selectedAddressB].price;
                    console.log(`Price of ${selectedTokenB}: ${usdCalcNowB}`);
                } else {
                    console.log(`Price data not found for ${selectedTokenB}`);
                }
            })
            .catch(error => {
                console.error(`Error fetching price for ${selectedTokenB}:`, error);
            });

            userPercentageChange = ((accountBalUSDCurrent - accountBalUSDStart) / accountBalUSDStart) * 100;
            percentageChange = ((usdCalcNowA - usdCalcStartA) / usdCalcStartA) * 100; 
            accountBalUSDCurrent = ((tokenABalanceNow.toFixed(selectedDecimalsA) * usdCalcNowA) + (tokenBBalanceNow.toFixed(selectedDecimalsB) * usdCalcNowB));
            console.log(`Current USD Value: ${accountBalUSDCurrent.toFixed(4)}`);
            usdCalcChange = accountBalUSDCurrent - accountBalUSDStart;
            console.log(`Current USD Profit: ${usdCalcChange.toFixed(4)}`);
            console.log(`Current Profit Percentage: ${userPercentageChange.toFixed(2)}`);
            console.log(`${selectedTokenA} percentage change since start: ${percentageChange.toFixed(2)}`);
            //Print Data                    
            console.log("");
            console.log(`Buy Orders: ${buyOrders}`);
            console.log(`Sell Orders: ${sellOrders}`);
            //Monitor price to last price difference.
            currentPrice = priceResponse.data.selectedTokenA.price.toFixed(selectedDecimalsA);
            if (currentPrice > lastPrice) { direction = "Trending Up" };
            if (currentPrice === lastPrice) { direction = "Trending Sideways" };
            if (currentPrice < lastPrice) { direction = "Trending Down" };
            console.log(direction);
            //Monitor current price and trend, compared to spread
            console.log("");
            if (currentPrice >= spreadUp) {
                console.log("Crossed Above! - Create Sell Order");
                await makeSellTransaction(selectedAddressA, selectedAddressB, slipTarget, selectedDecimalsA, devFeeB, devFee, fixedSwapVal);
                console.log("Shifting Layers Up");
                //create new layers to monitor
                spreadUp = spreadUp + spreadIncrement;
                spreadDown = spreadDown + spreadIncrement;
            }
            if (currentPrice <= spreadDown) {
                console.log("Crossed Down! - Create Buy Order");
                await makeBuyTransaction(selectedAddressA, selectedAddressB, slipTarget, selectedDecimalsB, devFeeA, devFee, fixedSwapVal, currentPrice);
                console.log("Shifting Layers Down");
                //create new layers to monitor
                spreadUp = spreadUp - spreadIncrement;
                spreadDown = spreadDown - spreadIncrement;
            }

            console.log(chalk.red(`Spread Up: ${spreadUp.toFixed(10)}`, "-- Sell"));
            console.log(`Price: ${priceResponse.data.selectedTokenA.price.toFixed(10)}`);
            console.log(chalk.green(`Spread Down: ${spreadDown.toFixed(10)}`, "-- Buy"));
            console.log("");
            lastPrice = priceResponse.data.selectedTokenA.price.toFixed(10);
        } else {
            console.log(`Token ${selectedTokenA} not found`);
            selectedTokenB = null;
            main();
        }
    } else {
        console.log(`Request failed with status code ${response.status}`)
    }
};    

async function makeSellTransaction(selectedAddressA, selectedAddressB, slipTarget, selectedDecimalsA, devFeeB, devFee, fixedSwapVal) {
    try {
        var tokenALamports = Math.floor(fixedSwapVal * (10 ** selectedDecimalsA));
        var slipBPS = Math.floor(slipTarget * 100);

        let url = '';
        if (devFee != 0 && devFeeB != "None") {
            url = 'https://quote-api.jup.ag/v6/quote?inputMint=' + selectedAddressA + '&outputMint=' + selectedAddressB + '&amount=' + tokenALamports + '&slippageBps=' + slipBPS + '&feeBps=';
        } else {
            url = 'https://quote-api.jup.ag/v6/quote?inputMint=' + selectedAddressA + '&outputMint=' + selectedAddressB + '&amount=' + tokenALamports + '&slippageBps=' + slipBPS;
        }
        console.log(url);

        const requestBody = {
            userPublicKey: wallet.publicKey.toString(),
            quoteResponse: jsonData
          };
      
          console.log('Request body sent to /swap endpoint:', requestBody);
      
          // Get serialized transactions for the swap
          const response = await axios.post('https://quote-api.jup.ag/v6/swap', requestBody, {
            headers: {
              'Content-Type': 'application/json',
            }
          });
      
          const { swapTransaction } = response.data;
      
          console.log('Swap transaction:', swapTransaction);
      
          // Deserialize the transaction
          const swapTransactionBuf = Buffer.from(swapTransaction, 'base64');
          var transaction = VersionedTransaction.deserialize(swapTransactionBuf);
      
          console.log("Making Sell Order!");
          console.log(transaction);
      
          // Sign the transaction
          transaction.sign([wallet.payer]);
      
          // Execute the transaction
          const rawTransaction = transaction.serialize();
          const txid = await connection.sendRawTransaction(rawTransaction, {
            skipPreflight: true,
            maxRetries: 2
          });
      
          await connection.confirmTransaction(txid);
      
          console.log(`https://solscan.io/tx/${txid}`);
          sellOrders++;
        } catch (error) {
          console.error('Transaction error:', error.message);
          console.error('Full error object:', error);
        }
};

async function makeBuyTransaction(selectedAddressA, selectedAddressB, slipTarget, selectedDecimalsB, devFeeA, devFee, fixedSwapVal, currentPrice) {
    try {
        var tokenBLamports = Math.floor(fixedSwapVal * currentPrice * (10 ** selectedDecimalsB));
        var slipBPS = Math.floor(slipTarget * 100);

        let url = '';
        if (devFee != 0 && devFeeA != "None") {
            url = 'https://quote-api.jup.ag/v6/quote?inputMint=' + selectedAddressB + '&outputMint=' + selectedAddressA + '&amount=' + tokenBLamports + '&slippageBps=' + slipBPS + '&feeBps=' + devFee;
        } else {
            url = 'https://quote-api.jup.ag/v6/quote?inputMint=' + selectedAddressB + '&outputMint=' + selectedAddressA + '&amount=' + tokenBLamports + '&slippageBps=' + slipBPS;
        }
        console.log(url);

        const response = await axios.get(url, {
            headers: {
              'Accept': 'application/json'
            }
          });
          const jsonData = response.data;
      
          if (!jsonData || !jsonData.routePlan || jsonData.routePlan.length === 0) {
            console.error('No routes found in the API response');
            return;
          }
      
          const requestBody = {
            userPublicKey: wallet.publicKey.toString(),
            quoteResponse: jsonData
          };
      
          console.log('Request body sent to /swap endpoint:', requestBody);
      
          // Get serialized transactions for the swap
          const swapResponse = await axios.post('https://quote-api.jup.ag/v6/swap', requestBody, {
            headers: {
              'Content-Type': 'application/json',
            }
          });
      
          const { swapTransaction } = swapResponse.data;
      
          console.log('Swap transaction:', swapTransaction);
      
          // Deserialize the transaction
          const swapTransactionBuf = Buffer.from(swapTransaction, 'base64');
          var transaction = VersionedTransaction.deserialize(swapTransactionBuf);
      
          console.log("Making Buy Order!");
          console.log(transaction);
      
          // Sign the transaction
          transaction.sign([wallet.payer]);
      
          // Execute the transaction
          const rawTransaction = transaction.serialize();
          const txid = await connection.sendRawTransaction(rawTransaction, {
            skipPreflight: true,
            maxRetries: 2
          });
      
          await connection.confirmTransaction(txid);
      
          console.log(`https://solscan.io/tx/${txid}`);
          buyOrders++;
        } catch (error) {
          console.error('Transaction error:', error.message);
          console.error('Full error object:', error);
        }
    };
main();
