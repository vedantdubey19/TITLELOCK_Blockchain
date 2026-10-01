"""Blockchain access: ChainAdapter interface, in-memory mock, web3.py live adapter.

Owner: Vedant. CHAIN_MODE=mock|live selects the adapter; nothing else in the app
should import web3 directly.
"""
