var pins = [];
for (var j=0;j<=cloth.h;j++)
pins.push(cloth.index(0, j));

var container, stats,
    camera, 
    scene, 
    controls,
    renderer,
    clothGeometry,
    object,
    moon = Math.random() > 0.9,
    manRotation = 0,
    manWindRotation = 0,
    manWindForce = 0,
    autoWind = true,
    autoRotate = true;
//thanks to https://github.com/Rob--W/cors-anywhere for helping me give reddit the middle finger c:
var corsURL = 'https://cors-anywhere.herokuapp.com/';
window.onload = ()=>
    getURL().then(url => 
    {
        if(!url) 
            return;
        init(url);
        animate();
    });
function findComment(id,children) //hh i just learnt you can just do reddit.com/comments/postID/commentID 
{
    for(var {data} of children)
    {
        if(data.id === id)
            return data;
        if(data.replies)
            if((result = findComment(id,data.replies.data.children)))
                return result;
    }
    return false;
}
async function getURL() {
    if(!window.fetch) {
        return fail('You are using an unsupported Browser')
    }
    var url = location.href.split('/'); //should always be 'https','','caltrop.dev','flag',<post id>,<comment id> (optional)
    var postID = url[4]; 
    if(!postID)
        return fail('Please enter a post ID');
    var commentID = url[5];
    
    var response = await fetch(corsURL+'https://www.reddit.com/comments/'+postID+'/.json')
    if(response.status == 404) 
        return fail('Invalid URL!');
    else if(response.status == 403) 
        return fail('Cannot access post!');
    else if(response.status == 400) {
        return fail('No Header');
    }

    var body = await response.json()
    var data = body[0].data.children[0].data;

    if(!commentID)
        if(!data.is_self && data.post_hint && data.post_hint.toLowerCase() == 'image') 
            return corsURL+data.url;
        else if(data.body == '[deleted]')
            return fail('Post has been deleted!')
        else
            return fail('No image found!');

    if(!(comment = findComment(commentID,body[1].data.children))) 
        return fail('Comment not found!')

    if(result = /a href="(https?:\/\/([^\/]+)\/([^.]+)\.(png|jpe?g|gif)((\?|#)([^"]+)))"/.exec(comment.body_html))
        return corsURL+result[1];
    else if(comment.body == '[deleted]')
        return fail('Comment has been deleted!')
    else
        return fail('No image found!');
}

function fail(str) {
    document.getElementsByClassName('loading')[0].remove();
    document.getElementsByClassName('failure')[0].style.display = 'block';
    document.getElementById('details').innerHTML = str;
    return null;
}

function init(flagImage) {
    container = document.createElement( 'div' );
    document.body.appendChild( container );
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog( 0x000000, 500, 10000 );
    if(moon) {
        scene.fog.color.setHSV( 0.67, 0.48, 0.13 );
    } else {
        scene.fog.color.setHSV( 0.6, 0.2, 1 );
    }

    camera = new THREE.PerspectiveCamera( 30, window.innerWidth / window.innerHeight, 1, 10000 );
    camera.position.y = 50;
    camera.position.z = 1500;
    scene.add(camera);

    scene.add( new THREE.AmbientLight( 0x666666 ) );

    var light = new THREE.DirectionalLight( 0xffffff, 1.75 );
    light.color.setHSV( 0.6, 0.125, 1 );
    light.position.set( 50, 200, 100 );
    light.position.multiplyScalar( 1.3 );

    light.castShadow = true;

    light.shadowMapWidth = 2048;
    light.shadowMapHeight = 2048;

    var d = 300;

    light.shadowCameraLeft = -d;
    light.shadowCameraRight = d;
    light.shadowCameraTop = d;
    light.shadowCameraBottom = -d;

    light.shadowCameraFar = 1000;
    light.shadowDarkness = 0.5;

    scene.add( light );

    light = new THREE.DirectionalLight( 0xffffff, 0.35 );
    light.color.setHSV( 0.3, 0.95, 1 );
    light.position.set( 0, -1, 0 );

    scene.add(light);

    THREE.ImageUtils.crossOrigin = 'anonymous';
    var clothTexture = THREE.ImageUtils.loadTexture(flagImage);
    if(!clothTexture) return fail('Your Browser has an encountered an Error while loading the texture');
    clothTexture.wrapS = clothTexture.wrapT = THREE.RepeatWrapping;
    clothTexture.anisotropy = 16;

    var materials = [
        new THREE.MeshPhongMaterial( { alphaTest: 0.5, ambient: 0xffffff, color: 0xffffff, specular: 0x030303, emissive: 0x111111, shiness: 10, perPixel: true, metal: false, map: clothTexture, doubleSided: true } ),
        new THREE.MeshBasicMaterial( { color: 0xff0000, wireframe: true, transparent: true, opacity: 0.9 } )
    ];

    clothGeometry = new THREE.ParametricGeometry( clothFunction, cloth.w, cloth.h, true );
    clothGeometry.dynamic = true;
    clothGeometry.computeFaceNormals();

    var uniforms = { texture:  { type: "t", value: 0, texture: clothTexture } };
    var vertexShader = document.getElementById( 'vertexShaderDepth' ).textContent;
    var fragmentShader = document.getElementById( 'fragmentShaderDepth' ).textContent;

    object = new THREE.Mesh( clothGeometry, materials[ 0 ] );
    object.position.set( 0, 0, 0 );
    object.castShadow = true;
    object.receiveShadow = true;
    scene.add( object );

    object.customDepthMaterial = new THREE.ShaderMaterial( { uniforms: uniforms, vertexShader: vertexShader, fragmentShader: fragmentShader } );

    var initColor = new THREE.Color( 0x00ff00 );
    initColor.setHSV( 0.25, 0.85, 0.5 );
    var initTexture = THREE.ImageUtils.generateDataTexture( 1, 1, initColor );

    var groundMaterial = new THREE.MeshPhongMaterial( { color: 0xffffff, specular: 0x111111, map: initTexture, perPixel: true } );

    var groundTexture = THREE.ImageUtils.loadTexture("./src/"+(moon ? "moon" : "grass")+".jpg", undefined, function() { groundMaterial.map = groundTexture } );
    groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
    groundTexture.repeat.set( 25, 25 );
    groundTexture.anisotropy = 16;

    var mesh = new THREE.Mesh( new THREE.PlaneGeometry( 20000, 20000 ), groundMaterial );
    mesh.position.y = -250;
    mesh.rotation.x = - Math.PI / 2;
    mesh.receiveShadow = true;
    scene.add( mesh );

    var poleGeo = new THREE.CubeGeometry( 5, 750, 5 );
    var poleMat = new THREE.MeshPhongMaterial( { color: 0xffffff, specular: 0x111111, shiness: 100, perPixel: true } );

    var mesh = new THREE.Mesh( poleGeo, poleMat );
    mesh.position.y = -175; //-250
    mesh.position.x = 0;
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    scene.add( mesh );

    var gg = new THREE.CubeGeometry( 10, 10, 10 );
    var mesh = new THREE.Mesh( gg, poleMat );
    mesh.position.y = -250;
    mesh.position.x = 0; //125
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    scene.add( mesh );

    renderer = new THREE.WebGLRenderer( { antialias: true, alpha: true } );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.setClearColor( scene.fog.color );
    if(moon) renderer.setClearColorHex( 0x121223, 1 );

    container.appendChild( renderer.domElement );

    renderer.gammaInput = true;
    renderer.gammaOutput = true;
    renderer.physicallyBasedShading = true;

    renderer.shadowMapEnabled = true;

    controls = new THREE.OrbitControls(camera, renderer.domElement),

    window.addEventListener( 'resize', onWindowResize, false );

    Array.from(document.getElementsByClassName('OL')).forEach((el) => {
        el.remove();
    })
    applyCookies();
}

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );

}

function animate() {
    requestAnimationFrame( animate );

    var time = Date.now();
    if(autoWind) {
        windStrength = Math.cos( time / 7000 ) * 100 + 200;
        windForce.set( Math.sin( time / 2000 ), Math.cos( time / 3000 ), Math.sin( time / 1000 ) ).normalize().multiplyScalar( windStrength );
    } else {
        windForce.set( Math.cos((manWindRotation / 180 * Math.PI)), Math.cos( time / 3000 ), Math.sin(((manWindRotation) / 180 * Math.PI))).normalize().multiplyScalar( manWindForce )
    }
    simulate(time);
    render();
}

function render() {
    var timer = Date.now() * 0.0002,
        p = cloth.particles;

    for ( var i = 0, il = p.length; i < il; i ++ ) {
        clothGeometry.vertices[ i ].copy( p[ i ].position );
    }

    clothGeometry.computeFaceNormals();
    clothGeometry.computeVertexNormals();

    clothGeometry.normalsNeedUpdate = true;
    clothGeometry.verticesNeedUpdate = true;

    if(autoRotate) {
        camera.position.x = Math.cos( timer ) * 1500;
        camera.position.z = Math.sin( timer ) * 1500;
    } else {
        camera.position.x = Math.cos( manRotation / 180 * Math.PI ) * 1500;
        camera.position.z = Math.sin( manRotation / 180 * Math.PI ) * 1500;
    }

    camera.lookAt( scene.position );
    renderer.render( scene, camera );
};

function vw(n) {
    return (n * (window.innerWidth/100));
}

function openNav() {
    document.getElementById("sidebar").style.width = vw(13.5)+"px";
    document.getElementById('sidebarButton').onclick = closeNav
    document.getElementById('sidebarButton').style.left = vw(13.5)+"px";
}

function closeNav() {
    document.getElementById("sidebar").style.width = "0";
    document.getElementById('sidebarButton').onclick = openNav
    document.getElementById('sidebarButton').style.left = "0px";
}

function manualWindEdit() {
    autoWind = false;
    document.getElementById('windRot').disabled = false;
    document.getElementById('windForce').disabled = false;
}

function disableWindEdit() {
    autoWind = true;
    document.getElementById('windRot').disabled = true;
    document.getElementById('windForce').disabled = true;
}

function manualCameraEdit() {
    autoRotate = false;
    manRotation = (Date.now() * 0.0002 - 45) % 360;
    document.getElementById('cameraRot').disabled = false;
    document.getElementById('cameraRot').value = manRotation;
}

function disableCameraEdit() {
    autoRotate = true;
    document.getElementById('cameraRot').disabled = true;
}

function setCookie(cname, cvalue) {
    var d = new Date();
    d.setTime(d.getTime() + (365 * 24 * 60 * 60 * 1000));
    var expires = "expires="+d.toUTCString();
    document.cookie = cname + "=" + cvalue.toString() + ";" + expires + ";path=/";
}
  
function getCookie(cname) {
    var name = cname + "=";
    var ca = document.cookie.split(';');
    for(var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

function applyCookies() {
    if(getCookie('rotWindEn') && getCookie('rotWindEn') == "true") {
        document.getElementById('manWind').click();
    }

    manWindRotation = +getCookie('manWindRot');
    document.getElementById('windRot').value = manWindRotation;

    manWindForce = +getCookie('manWindForce');
    document.getElementById('windForce').value = manWindForce;

    if(getCookie('rotCamEn') && getCookie('rotCamEn') == "true") {
        document.getElementById('manCam').click();
    }

    manRotation = +getCookie('manCamRot');
    document.getElementById('cameraRot').value = manRotation;
}