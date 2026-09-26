#!/bin/bash
# Opens the separate "PureNutrix Chrome" with Amazon, Amazon Ads, Flipkart and Meesho tabs.
# Log in to each ONCE (OTP too). n8n reads the panels from this window every morning.
cd "$(dirname "$0")/.." && node panel-reader/open-login.mjs
