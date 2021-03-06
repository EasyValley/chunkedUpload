const fileInput = document.querySelector('#fileInput');
const uploadBtn = document.querySelector('#uploadBtn');

let fileResult; // 存储文件到二进制
let chunkSize = 2 * 1000 * 1000; // 每一块到大小
let hash;   // 文件哈希值
let haveUploadChunkList;    // 已上传的块
let total;  // 总块数
let filename;   // 文件名

uploadBtn.addEventListener('click', uploadEvent, false);

// 上传事件
function uploadEvent() {
    if (!fileInput.files.length) {
        alert('please choose your file.')
    }
    const file = fileInput.files[0];
    const reader = new FileReader();

    filename = file.name;
    reader.readAsBinaryString(file);
    reader.onload = fileOnload;
}

// reader.onload 文件加载完
function fileOnload(e) {
    fileResult = e.target.result;
    // 检查已有的块
    checkMd5(e.target.result)
        .then(res => {
            if (res.data.code === 200) {
                total = Math.ceil(fileResult.length / chunkSize);
                haveUploadChunkList = res.data.chunkList;
                hash = res.data.hash;

                sendChunkRecursion(0, chunkSize, fileResult, hash);
            }
        });
}


function checkMd5(data) {
    const hash = md5(data);
    return axios(`/checkMd5?md5=${hash}`);
}

// 递归发送块 逐块的发
function sendChunkRecursion(num, chunkSize, data, hash) {

    if (haveUploadChunkList.indexOf(num) != -1) {
        sendChunkRecursion(++num, chunkSize, data, hash);
        return;
    }

    if (num >= total) {
        mergeFile();
        return;
    }

    axios.post(`/sendChunk`, {
        chunk: data.slice(num * chunkSize, (num + 1) * chunkSize),
        num: num,
        hash: hash
    }).then(res => {
        if (res.data.code === 200) {
            haveUploadChunkList.push(num);
            console.log(parseInt(haveUploadChunkList.length * 100 / total) + '%');
            sendChunkRecursion(++num, chunkSize, data, hash);
        }
    }).catch(err => {
        sendChunkRecursion(num, chunkSize, data, hash);
    });
}

// 合并文件
function mergeFile() {
    axios(`/mergeFile?md5=${hash}&filename=${hash}-${filename}`)
        .then(res => {
            if (res.data.code === 200) {
                console.log('upload successfully.');
            }
        });
}