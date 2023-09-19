const {file, session} = require('../index'),
    fileLib = file;

module.exports = {
    Query: {
        fileClass: async (parent, {id}, {agentId}) =>
            file.FileClass.getById(id),
        fileClasses: async (parent, {}, {agentId}) => {
            const data = await file.FileClass.list(),
                totalCount = await file.FileClass.count();
            let pag = 0;
            return {
                totalCount,
                totalEdges: data.length,
                pag, hasMore: ((pag + 1) * num < totalCount),
                edges: data.map(node => ({node}))
            };
        },
        fileType: async (parent, {id, mime, extension}, {agentId}) => {
            if (id) return file.FileType.getById(id);
            else if (mime) return file.FileType.getByMime(mime);
            else if (extension) return file.FileType.getByExtension(extension);
            else throw new Error('Debe especificar id, mime o extension');
        },
        fileTypes: async (parent, {pag, num, ord, asc, filter}, {agentId}) => {
            const data = await file.FileType.list(filter, {pag, num, ord, asc}),
                totalCount = await file.FileType.count(filter);
            return {
                totalCount,
                totalEdges: data.length,
                pag, hasMore: ((pag + 1) * num < totalCount),
                edges: data.map(node => ({node}))
            };
        },
        fileStatus: async (parent, {id}, {agentId}) =>
            file.FileStatus.getById(id),
        fileStatuses: async (parent, {}, {agentId}) => {
            const data = await file.FileStatus.list(),
                totalCount = await file.FileStatus.count();
            return {
                totalCount,
                totalEdges: data.length,
                pag, hasMore: ((pag + 1) * num < totalCount),
                edges: data.map(node => ({node}))
            };
        },
        file: async (parent, {id, previewSize}, {agentId}) =>
            await fileLib.File.getById(id, previewSize),
        files: async (parent, {pag, num, ord, asc, path, previewSize, filter}, {agentId}) => {
            let data = await fileLib.File.list(filter, {pag, num, ord, asc, previewSize});
            const totalCount = await fileLib.File.count(filter);
            return {
                totalCount,
                totalEdges: data.length,
                pag, hasMore: ((pag + 1) * num < totalCount),
                edges: data.map(node => ({node: fileLib.File.resolveUrl(node)}))
            }
        },
        filePreview: async (parent, {id, file, height = fileLib.FilePreview.DEFAULT_SIZE}, {agentId}) => {
            let _filePreview = null;
            if (id) _filePreview = await fileLib.FilePreview.getById(id, height);
            else if (file) _filePreview = await fileLib.FilePreview.getByFileId(file, height);
            else throw new Error('Debe especificar id, o file');
            if (!_filePreview) return null;
            return fileLib.FilePreview.resolveUrl(_filePreview);
        },
        filePreviews: async (parent, {pag, num, ord, asc, file, height}, {agentId}) => {
            const data = await fileLib.FilePreview.list({
                    file, height
                }, {pag, num, ord, asc}),
                totalCount = await fileLib.FilePreview.count({
                    file, height
                });
            return {
                totalCount,
                totalEdges: data.length,
                pag, hasMore: ((pag + 1) * num < totalCount),
                edges: data.map(node => ({node: fileLib.FilePreview.resolveUrl(node)}))
            };
        }
    },
    Mutation: {
        signUpload: async (parent, {name, path}, {agentId}) =>
            file.File.signUpload(name, path),
        verifyUpload: async (parent, {id, etag}, {agentId}) =>
            file.File.verifyUpload(id),
        deleteFile: async (parent, {id}, {agentId}) =>
            file.File.delete(id)
    },
    Subscription: {
        createdFile: {
            subscribe: (parent, {id, path}, {pubsub}) => {
                if (id) return pubsub.asyncIterator(`createdFile:id=${id}`);
                else if (path) return pubsub.asyncIterator(`createdFile:path=${path}`);
                else return pubsub.asyncIterator(`createdFile`);
            }
        },
        updatedFile: {
            subscribe: (parent, {id}, {pubsub}) => id ? pubsub.asyncIterator(`updatedFile:id=${id}`) : pubsub.asyncIterator('updatedFile')
        },
        deletedFile: {
            subscribe: (parent, {id, path}, {pubsub}) => {
                if (id) return pubsub.asyncIterator(`deletedFile:id=${id}`);
                else if (path) return pubsub.asyncIterator(`deletedFile:path=${path}`);
                else return pubsub.asyncIterator(`deletedFile`);
            }
        },
        fileAddedPreview: {
            subscribe: (parent, {file, index, height}, {pubsub}) => {
                if ((!index && index !== 0) && !height) return pubsub.asyncIterator(`fileAddedPreview:file=${file}`);
                else if ((index === 0 || index) && height) return pubsub.asyncIterator(`fileAddedPreview:file=${file}:index=${index}:height=${height}`);
                else if ((index === 0 || index)) return pubsub.asyncIterator(`fileAddedPreview:file=${file}:index=${index}`);
                else if (height) return pubsub.asyncIterator(`fileAddedPreview:file=${file}:height=${height}`);
            }
        }
    }
};
