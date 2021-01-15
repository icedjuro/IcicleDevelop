import fs from 'fs'
import path from 'path'

export default class FileTree {
  itemPath: string;
  name: string;
  children: FileTree[] = [];
  isDir: boolean;

  constructor(itemPath: string, name: string, isDir = false) {
    this.itemPath = itemPath;
    this.name = name;
    this.isDir = isDir;
  }

  generate() {
    this.children = FileTree.readDir(this.itemPath);
  }

  static readDir(itemPath: string) {
    var fileArray: FileTree[] = [];

    fs.readdirSync(itemPath).forEach(file => {
        var fileInfo = new FileTree(path.join(itemPath, file), file);

        var stat = fs.statSync(fileInfo.itemPath);

        if (stat.isDirectory()){
            fileInfo.isDir = true;
            fileInfo.children = FileTree.readDir(fileInfo.itemPath);
        }

        fileArray.push(fileInfo);
    })

    return fileArray;
  }
}