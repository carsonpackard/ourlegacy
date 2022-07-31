const { ObjectID } = require('bson');
var express = require('express');
var fs = require('fs');
const path = require('path');
const formidable = require("formidable");
var app = express();
const { parseSync } = require('subtitle')
const MongoClient = require('mongodb').MongoClient;
// set the view engine to ejs
const uploadPath = path.join(__dirname, 'assets/');
const uri = 'mongodb+srv://dbadmin:Icecream2018!@cluster0.nyfphpc.mongodb.net/?retryWrites=true&w=majority';
const client = new MongoClient(uri, { useNewUrlParser: true });

client.connect();
const media = client.db('Legacy').collection('media')
const subdb = client.db('Legacy').collection('subtitles')

async function findListings(client, resultsLimit) {
  // const cursor = client.db('Legacy').collection('media').find()
  const subtitle_cursor = client.db('Legacy').collection('subtitles').find({ 'subtitles.subtitle' : {$regex:"example"}});
  
  const results = await subtitle_cursor.toArray();
  // console.log(results.length);
  
  // if (results.length > 0) {
    // console.log(`Found ${results.length} listing(s):`);
    // results.forEach((result, i) => {
      //   var current_item = cursor.find(result.media_id)
      //   console.log();
      //   console.log(`${i + 1}. name: ${current_item.title}`);
      //   console.log(`type: ${current_item.type}`);
      //   console.log(`filepath: ${current_item.filePath}`);
      // });
      // }
    }
    app.set('view engine', 'ejs');

    app.get('/', function(req, res) {
  var mascots = [
    { name: 'Sammy', organization: "DigitalOcean", birth_year: 2012, id:1},
    { name: 'Tux', organization: "Linux", birth_year: 1996, id:2},
    { name: 'Moby Dock', organization: "Docker", birth_year: 2013, id:3}
  ];
  var tagline = "No programming concept is complete without a cute animal mascot.";
  
  res.render('pages/index', {
    mascots: mascots,
    tagline: tagline
  });
});
app.get('/search', async function(req, res) {
  var query = req.query.q;
  var advanced = req.query.advanced;
  var caseSensative = req.query.case;
  var search_cursor;
  if(advanced == true){
    search_cursor = await client.db('Legacy').collection('subtitles').find({text: {$regex: query}})
  } else if (query.includes("*") ){
    query = query.replaceAll("*", ".*")
    search_cursor = await client.db('Legacy').collection('subtitles').find({text: {$regex: query}})
  }else if (caseSensative != null && caseSensative.toLocaleLowerCase() === 'true'){
    query = "\""+query+"\""
    search_cursor = await client.db('Legacy').collection('subtitles').find({ $text : {$search: query}}).sort({"media_id":-1});
  
  }else{

    search_cursor = await client.db('Legacy').collection('subtitles').find({ $text : {$search: query}}).sort({"media_id":-1});
  }
  // console.log(query)
  //   "$search": {
  //     "wildcard": {
  //       "path": "text",
  //       "query": query
  //     }
  //   }
  // }).sort({"media_id":-1});
  var allSubtitles = await search_cursor.toArray() 
  var results = []
  // console.log(allSubtitles)
  var sublength = allSubtitles.length;
  if(sublength > 0){
    var subtitles = []
    var currentId = allSubtitles[0].media_id;
    var currentMedia;
    var lastId = null;
    for ( var index=0; index<sublength; index++ ) {
      currentId = allSubtitles[index].media_id
      subtitles.push(allSubtitles[index])
      lastId = currentId
      if(index+1 === sublength || !currentId.equals(allSubtitles[index+1].media_id)){
        currentMedia = await client.db('Legacy').collection('media').findOne({'_id':subtitles[0].media_id});
        results.push({'media':currentMedia, 'subtitles':subtitles}); 
        subtitles = []   
      }
    }
  }
  // console.log(results)

  res.render('pages/search.ejs', {results:results});

});
app.post('/update', async function(req, res) {
  var id= req.params.id;
  var form = new formidable.IncomingForm({});

  form.parse(req, async (err, fields, files) => {

    var text = fields.text
    var id = fields.id
    console.log(text, id)
    if(text != null && id != null){
      try {
        var newId = new ObjectID(id)
        const search_cursor = await client.db('Legacy').collection('subtitles').findOneAndUpdate({'_id':newId}, {$set: { "text": text }});
        // console.log(search_cursor)
      }catch(BSONTypeError){
        console.log("Error, cannot convert to id")
      }
    }
  });

});
// about page
app.get('/about', function(req, res) {
    // var path = req.params.post;
    res.render('pages/about');
});

app.get('/stream/:path', (req, res) => {
    var path = req.params.path;
    // console.log(path)
    const filePath = "./assets/"+path;

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ data: 'OMG file not found'});
    }
    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;
    if (range) {
      let parts = range.replace(/bytes=/, '').split('-');
      let start = parseInt(parts[0], 10);
      let end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      let chunkSize = end - start + 1;
      let file = fs.createReadStream(filePath, {
        start,
        end,
      });
      let headers = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': 'video/mp4',
      };
   
      res.writeHead(206, headers);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
      };
      res.writeHead(200, head);
      fs.createReadStream(filePath).pipe(res);
    }
  });
  app.get('/upload', function(req, res) {
    res.render('pages/upload');
});
app.post("/upload", async function(req, res) {
  
  const options = {
    uploadDir: uploadPath,
    keepExtensions: true,
    multiples : true,
    maxFileSize : 5000 * 1024 * 1024

  };
  var form = new formidable.IncomingForm(options);

  form.parse(req, async (err, fields, files) => {
    if (err) {
      res.status(404).json({message:"error",err});
      console.log(files, fields);
    }else{
      var srt = [];
      var title = "";
      var description = "";
      var thumbnailPath = "default.jpg";
      description = fields.description
      if (fields.title !== ''){
        title = fields.title
      }else{
        title = path.parse(files.fileupload.originalFilename).name
      }
      if (typeof files.fileupload3 !== 'undefined') {
        thumbnailPath = files.fileupload3.newFilename
      }

      var new_media = {"title":title, "description":description, "thumbnail":thumbnailPath,"type":"video", "filePath":files.fileupload.newFilename, "date_of_media":new Date(fields.dateOfMedia), "playlists":[]}
      var ret = await media.insertOne(new_media)
      // var ret = {'insertedId': 7832782378429742}
      if (typeof files.fileupload2 !== 'undefined') {
        srt = fs.readFileSync(`./assets/`+files.fileupload2.newFilename, 'utf8');
        var result = parseSync(srt)
        var tempData = [];
        for ( var index=0; index<result.length; index++ ) {
            tempData.push( {'media_id':ret.insertedId,'start':result[index].data.start, 'stop':result[index].data.end, 'text':result[index].data.text} );
        }
        if (tempData.length > 1){

          await subdb.insertMany(tempData)
        }
      }
      // var new_sub = {"media_id":ret.insertedId, "subtitles":result}
      
      // console.log(tempData);
      // console.log(new_media);
      
      res.redirect('/upload');

    }
  });
});

app.get('/media/:media_id', async function(req, res) {
    var media_id = req.params.media_id;
    var startTime = 0;
    var title = "";
    var subtitles = [];
    var src = "";
    if (typeof req.query.t !== 'undefined') {
      startTime = req.query.t;
    }
    try{

      var object = new ObjectID(media_id)
      const cursor = await media.findOne({'_id':object});
      const subtitle_cursor = await subdb.find({'media_id':object}).toArray();
      
      // const results = cursor.toArray();
      // console.log(cursor, subtitle_cursor)
      var title = cursor.title
      var subtitles = subtitle_cursor
      var src = cursor.filePath

      var url = req.protocol + '://' + req.get('host') + "/subtitles/"+media_id;
      var updateUrl = req.protocol + '://' + req.get('host') + "/update";
    }catch(BSONTypeError){
      console.log("Error, cannot convert to id")
    }
    // console.log(url)
    res.render('pages/video', {title:title, subtitles:subtitles, src:src, startTime:startTime, url:url, updateUrl:updateUrl});
});
app.get('/subtitles/:subtitle_id', async function(req, res) {
  var subtitle_id = req.params.subtitle_id;

  var subtitles = [];

  try{
    var object = new ObjectID(subtitle_id)
    // console.log(subtitle_id)
 
    const subtitle_cursor = await subdb.find({'media_id':object}).toArray()
    // console.log(subtitle_cursor)
    for ( var index=0; index<subtitle_cursor.length; index++ ) {
        subtitles.push( {'start':subtitle_cursor[index].start, 'stop':subtitle_cursor[index].stop, 'text':subtitle_cursor[index].text} );
    }

  //  console.log(subtitles)
  }catch(BSONTypeError){
    console.log("Error, cannot convert to id")
  }
  // console.log(subtitles)
  res.end(JSON.stringify({'subtitles':subtitles}))
});
// app.use(express.static(path.join(__dirname, 'client')))
app.use('/js',express.static('assets/js')); 
app.use('/images', express.static('assets/images'));
app.listen(8080);
console.log('Server is listening on port 8080');
