'use strict';

const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('freebird', {
  platform: process.platform,
  versions: process.versions
});
