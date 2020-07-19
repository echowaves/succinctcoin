# succinctcoin

Minimalistic crypto currency which can be used as a reference implementatino for easily starting a bkockchain project. 

## getting started

Clone the project 
```
git clone git@github.com:echowaves/succinctcoin.git
cd succinctcoin
```
Make sure to use node 13. Unfortunately some of the dependencies still do not work with node 14. It's suggested to use nvm for easy managing of node environments.

Build dependencies, run `yarn`

To start project in dev, run `yarn dev`

Package project as a mac, linux, or windows app, run `yarn dist:all`. This will generate the os specific bundles inside `dist` forlder.

Have fun.
