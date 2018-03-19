# 1. Disclaimer

# 2. Introduction

# 3. Executive Summary

# 4. Detailed Scope

## 4.1 Audited Source Code
### 4.1.1 Dala Corporation

## 4.2 Original Codebases
### 4.2.1 TokenMarket
### 4.2.2 Gnosis
### 4.2.3 OpenZeppelin

## 4.3 Methodology
### 4.3.1 Differential Analysis
### 4.3.2 Dynamic Analysis
### 4.3.3 Code Review
### 4.3.4 Automated Analysis

# 5. Smart Contract Descriptions

## 5.1 Dala Token Sale
### 5.1.1 Cap
### 5.1.2 Whitelist
### 5.1.3 Daily Ether Cap
### 5.1.4 FlatPricing
### 5.1.5 Finalizable
### 5.1.6 Haltable

## 5.2 Dala Token
### 5.2.1 Releasable
### 5.2.2 Upgradable
### 5.2.3 Pausable

## 5.3 Wallets
### 5.3.1 MultiSigWallet

# 6. Differential Analysis

## 6.1 Notable Differences
### 6.1.1 Crowdsale.sol
#### Added baseEthCap Functionality
#### Added Whitelist Functionality
#### Fallback Function Changed from throw to buy()
#### Changed Token Inheritance

# 7. Detailed Findings

## 7.1 High Risk

## 7.2 Medium Risk

## 7.3 Low Risk
### 7.3.1 Pausing Functionality has a Single Point of Failure
### 7.3.2 Low Coverage of Tests

## 7.4 Informational
### 7.4.1 Multisignature Wallet Expands Attack Surface
### 7.4.2 Token Upgrade can be Required through Pause
### 7.4.3 Unmarked Visibility on Functions and State Variables
### 7.4.4 Inexact and Inconsistent Solidity Compiler Version
### 7.4.5 Using Undocumented Solidity Behavior 
### 7.4.6 Errors and Warnings

# 8. Appendix

## Appendix I: Test Coverage

## Appendix II: Compilation Output

## Appendix III: Static Analysis Results
### Iosiro’s Proprietary Static Analysis Tool
### Remix IDE
### Oyente

## Appendix IV: Linter Results

## Appendix V: Differential Analysis Results

## Appendix VI: Max Ether Cap Functionality Added
