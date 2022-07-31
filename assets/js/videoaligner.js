
var TextFinder = function(options) {
	

	
	// store options
	for (var opt in options) {
		this[opt] = options[opt];
	}
	
	this.skipTagsRegex = new RegExp('^(' + this.skipTags.join('|') + ')$', 'i');
	this.skipClassesRegex = new RegExp('\b(' + this.skipClasses.join('|') + ')\b', 'i');	
	
}
TextFinder.prototype = {
	
	foundTagName: 'span',
	foundTagClass: 'aligned-Subtitle',
	
	skipTags: [],
	skipClasses: [],
	
	root: null,
	currentDepth: -1,
	currentNode: null,
	
	lastSuccessfulNode: null,
	lastSuccessfulDepth: -1,
	
	currentText: '',
	
	reset: function() {
		this.lastSuccessfulNode = null;
		this.lastSuccessfulDepth = -1;		
	},
	
	// public function to start things up
	next: function(text) {
		

		
		// if we haven't found a node yet, then we need to start over
		if (this.lastSuccessfulNode == null) {
			this.currentNode = this.root.childNodes[0];
			
		} 
		
		return this._searchNodes();
	},
	
	_searchNodes: function() {
		
		var t = this,
			foundNode = null;
			
		
		
		// spin through nodes until we find the text
		while (this.currentNode && foundNode == null) {
			switch (this.currentNode.nodeType) {
				// for elements, we need to go down to the next level
				case 1: // ELEMENT_NODE
				foundNode = this.currentNode
				this.lastSuccessfulNode = foundNode
				this.currentNode = this.currentNode.nextSibling;
				
				return foundNode;
					
				case 3: // TEXT_NODE
				case 4: // CDATA_SECTION_NODE
			}

			// if we didn't find anything in this node,
			// then go to the next sibling node or back up to the parent
			if (this.currentNode.nextSibling) {
				this.currentNode = this.currentNode.nextSibling;
			} else {
				
				while (this.currentDepth > 0) {
					this.currentNode = this.currentNode.parentNode;
					this.currentDepth --;
					if (this.currentNode.nextSibling) {
						this.currentNode = this.currentNode.nextSibling;
						break;
					}
				}
			}
		}		
		
		return null;
	},
	
};


var VideoAligner = function(target, video) {
	

	this.videoStartTime;
	// hook up to media
	this.video = video;
	
	
	// target node where stuff will get loaded
	
	this.target = target;
	
	// node finder
	this.textfinder = new TextFinder({root: this.target, skipTags: ['h1','h2','h3'], skipClasses: ['cf','note','v-num']});
}
VideoAligner.prototype = {
	
	currentSubtitleClassName: 'current-subtitle',
	
	timingData: null,
	
	align: function(timingUrl, time) {

		this.timingUrl = timingUrl;
		this.videoStartTime = time
		
		this.loadTimings();
		
	},
	
	loadTimings: function() {
		// console.log(this.timingUrl)
		fetch(this.timingUrl)
				.then(res => res.json())
				.then((out) => {
	
					this.timingData = out.subtitles;
					this.assignTimings();
					// console.log(this.timingData);
			}).catch(err => console.error("ERORR",err));

	
		
	},
	
	assignTimings: function() {
		
		// go through all the Subtitles in the array
		for (var SubtitleIndex=0, SubtitleTotal = this.timingData.length; SubtitleIndex < SubtitleTotal; SubtitleIndex++) {
			var timing = this.timingData[SubtitleIndex],
			Subtitle = timing.text;
			
			// attempt to find this Subtitle and create a new node out of it
			var node = this.textfinder.next(Subtitle);
			
			if (node != null) {
				
				// store node so we can refer to it as the video plays
				timing.node = node;
				
				
			}
			
		}
		// console.log(this.timingData)
		this.textfinder.reset();
		this.video.currentTime = this.videoStartTime;
	},
	
	selectSubtitle: function() {
		
		
		if (this.timingData != null) {
			var time = this.video.currentTime;
			
			// removing existing current class
			var currents = document.getElementsByClassName(this.currentSubtitleClassName);
			if (currents.length > 0)
			currents[0].className = currents[0].className.replace(this.currentSubtitleClassName, '');
			
			// find a Subtitle with the current time
			for (var i=0, il=this.timingData.length; i<il; i++) {
				var subtitle = this.timingData[i];
				var start = subtitle.start/1000;
				var stop = subtitle.stop/1000;
				if (time >=  start && time <=  stop) {
					var node = subtitle.node;
					node.className += ' ' + this.currentSubtitleClassName;

					this.target.scrollTo({left:0,top:node.offsetTop-this.target.offsetTop,behavior: 'smooth'}) 
				}
			}	
		}	
	}
};
