/**
 * 七鱼SDK 基类
 *
 * @author:   波比(｡･∀･)ﾉﾞ
 * @date:     2016-10-25  下午8:11
 */

const EventEmitter = require('events').EventEmitter;

class SDK extends EventEmitter {
    constructor(options) {
        super(options);
        this.ROOT = options.ROOT || '';
        this.VERSION = '2.8.0'; //版本信息
        this.winParam = options.winParam || {}; // 窗口信息参数
        this.proxy; // iframe 代理
        this.chatProxy; // 浮层模式下, 聊天窗口代理
        this.firstBtnClick = true;
        this.CircleNumberFlag = 0;
        this.msgSessionIds = [];

        // App init and SDK build
        util.each({
            DOMAIN: ysf.ROOT + '/',
            IMROOT: (function() {
                var ret = window.__YSFWINTYPE__ == 1 ? (ysf.ROOT + '/client/iframe') : (ysf.ROOT + '/client');

                if (util.isMobilePlatform()) {
                    ret = ysf.ROOT + '/client';
                }

                return ret;

            })(),
            RESROOT: ysf.ROOT + '/sdk/'
        }, function(k, v) {
            if (ysf[k] == null) {
                ysf[k] = v;
            }
        });

        // migrate cookie to storage
        util.migrate();

        // build proxy
        util.buildProxy();

        this.init(options);
    }

    init(sdkURL) {
    	var self = this;
        var init = function() {
            self.entry({
                src: sdkURL
            });

            if (cache.getItemsInCache('winType') == 1) {
                self.entryPanel(cache.getItemsInCache('corpInfo'));
            }
        };

        /**
         * 询问服务器配置信息
         *
         * @date: 2016-09-09  下午2:18
         * @param {Number} dvcSwitch          - 会话在线开关 1: 开 0: 关
         * @param {Number} pushSwitch		  - 消息推送开关 1: 开 0: 关
         * @param {Number} batchIdList		  - 要申请的消息Id
         */

        setTimeout(function() {
            util.ajax({
                url: ysf.DOMAIN + 'webapi/user/dvcSession.action?k=' + cache['appKey'] + '&d=' + cache['device'] + '&f=' + cache['uid'],
                success: function(json) {
                    if (json.code == 200) {
                        cache['dvcswitch'] = json.result.dvcSwitch; //|| json.result.dvcSwitch
                        cache['pushswitch'] = json.result.pushSwitch || 0;
                        cache['pushmsgid'] = json.result.batchIdList || 0;
                        init();
                    } else {
                        cache['dvcswitch'] = 0;
                        cache['pushswitch'] = 0;
                        init();
                    }
                },
                error: function() {
                    cache['dvcswitch'] = 0;
                    cache['pushswitch'] = 0;
                    init();
                }
            });
        }, 1000);
    }

    /**************接口层*************/

    /**
     * 未读消息
     */
    unread() {

        }
        /**
         * 配置方式
         */
    config() {

    }

    /**
     * 商品链接
     *
     */
    product() {

    }

    /**
     * 事件监听
     *
     */
    on() {

    }

    /**
     * 登出
     *
     */
    logoff() {

    }

    /**
     * 打开访客端窗口
     */
    open() {

    }

    /**
     * 构建访客相关样式
     *
     * @param  {String} css 				- 样式内容
     * @return {Void}
     */
    style(content) {
        if (!content) {
            return;
        }
        var head = document.getElementsByTagName('head')[0] || document.body,
            node = document.createElement('style');
        node.type = 'text/css';
        head.appendChild(node);
        if ('textContent' in node) {
            node.textContent = content;
        } else if (!!node.styleSheet) {
            node.styleSheet.cssText = content;
        }
    }

    /**
     * 打开客服内嵌模式
     *
     * @param {String | Node} parent 			- 父节点元素
     * @param {Number} status					- 浮层模式标识
     */
    openInline(parent, status) {
        var url = this.url.apply(
            this, arguments
        );
        if (!url) {
            return;
        }

        url = util.mergeUrl(url, {
            w: cache.getItemsInCache('winType')
        })


        var initIframe = function(url) {
            var iframe = document.createElement('iframe');
            iframe.src = url;
            iframe.id = 'YSF-IFRAME-LAYER';
            iframe.style.width = '100%';
            iframe.style.height = '100%';
            return iframe;
        };
        chatProxy = initIframe(url);
        parent.appendChild(chatProxy);

        util.addEvent(chatProxy, 'load', function() {
            if (status == 1) {
                sendChatMsg('doconnect', { doconnect: 1 });
            } else if (status == 0 && cache['pushswitch'] == 1) {
                sendChatMsg('dopushmsg', { 'pushMsgSwitch': 1, 'pushMsgId': cache.getItemsInCache('pushmsgid') });
            }
        })
    }

    /**
     * 构建在线客服节点
     * @param  {Object} options      			- 配置信息
     * @param  {String} options.src  			- 图片地址
     */
    entry(options) {
        var self = this;
        // 构建父容器
        var buildHolder = function() {
            var holder = document.createElement('div'),
                customStr = "YSF-CUSTOM-ENTRY-" + window.__YSFTHEMELAYEROUT__;

            if (window.__YSFTHEMELAYEROUT__) {
                holder.className = 'layer-' + window.__YSFTHEMELAYEROUT__;
            }

            holder.setAttribute('id', 'YSF-BTN-HOLDER');

            if (cache.getItemsInCache('hidden') == 1) holder.style.display = 'none';

            document.body.appendChild(holder);

            holder.onclick = function() {
                self.open();
            };

            holder.innerHTML = '<div id="' + customStr + '"><img src="' + options.src + '"/></div>';
            return holder
        };


        // 构建circle子节点

        var buildCircle = function(parent) {
            var circle = document.createElement('span');
            circle.setAttribute('id', 'YSF-BTN-CIRCLE');
            parent.appendChild(circle)
        };

        // 构建Bubble子节点
        var buildBubble = function(parent) {
            var container = document.createElement('div'),
                content = document.createElement('div'),
                arrow = document.createElement('span'),
                close = document.createElement('span');

            container.setAttribute('id', 'YSF-BTN-BUBBLE');
            content.setAttribute('id', 'YSF-BTN-CONTENT');
            arrow.setAttribute('id', 'YSF-BTN-ARROW');
            close.setAttribute('id', 'YSF-BTN-CLOSE');

            close.onclick = function(event) {
                event.stopPropagation();
                event.preventDefault();
                self.NotifyMsgAndBubble({ category: 'clearCircle' });
            };

            parent.appendChild(container);
            container.appendChild(content);
            container.appendChild(arrow);
            container.appendChild(close);
        };

        var parent = buildHolder();
        buildCircle(parent);
        buildBubble(parent);
    }

    /**
     * 构建在线客服控制台 Iframe容器
     *
     * @param {Number} corpInfo				- 1 显示右侧栏导航, 2 隐藏右侧栏导航
     */
    entryPanel(corpInfo) {
        var div = document.createElement('div'),
            layerOpen = cache.getItemsInCache('winType') == 1 ? 0 : 1;

        parseInt(corpInfo) ? div.setAttribute('id', 'YSF-PANEL-CORPINFO') : div.setAttribute('id', 'YSF-PANEL-INFO');
        div.className = 'ysf-chat-layer';
        document.body.appendChild(div);
        div.setAttribute('data-switch', layerOpen);


        try {
            message.sendChatMsg('status', { 'layerOpen': layerOpen });
        } catch (ex) {};

        util.createDvcTimer();

        this.openInline(div, cache['dvcswitch']);

    }

    /**
     * 弹出邀请窗口
     *
     * @param  {Object} config - 配置信息
     * @param  {String} config.src      		- 背景图片地址
     * @param  {String} config.text     		- 提示文字
     * @param  {String} config.reject   		- 关闭后对应操作方式
     * @param  {Number} config.timeout  		- 邀请等待时间
     * @param  {Number} config.interval 		- 关闭后再次打开时间
     * @return {Void}
     */
    invite(function() {
        var nWrap, nBody, nText, xConf,
            doc = document.createDocumentFragment();
        var buildInvite = function() {
            if (!!nWrap && !!nBody) {
                return;
            }
            // build wrapper
            nWrap = document.createElement('div');
            nWrap.className = 'ysf-online-invite-mask';
            // build body
            nBody = document.createElement('div');
            nBody.className = 'ysf-online-invite-wrap';
            nBody.innerHTML = '<div class="ysf-online-invite"><div class="text"></div><div class="close" title="关闭"></div><img/></div>';
            var node = nBody.childNodes[0],
                list = node.childNodes,
                ntxt = list[0];
            if ('innerText' in ntxt) {
                ntxt.innerText = xConf.text;
            } else {
                ntxt.textContent = xConf.text;
            }
            // init event
            node.onclick = openChat;
            list[1].onclick = closeInvite;
            list[2].onload = function() {
                window.setTimeout(updatePosition, 100);
                // ntxt.style.marginTop = -ntxt.offsetHeight / 2 + xConf.marginTop + 'px';
            };
        };
        var setImage = function(src) {
            nBody.getElementsByTagName('IMG')[0].src = src;
        };
        var updatePosition = function() {
            var node = nBody.childNodes[0];
            // node.style.top = -nBody.offsetHeight / 2 + 'px';
            nBody.style.visibility = 'visible';
        };
        var openChat = function() {
            ysf.open();
            hideInvite();
        };
        var closeInvite = function(event) {
            // stop event
            event = event || window.event || {};
            if (event.stopPropagation) {
                event.stopPropagation();
            } else {
                event.cancelBubble = !0;
            }
            // hidden invite
            if (nWrap.parentNode != doc) {
                hideInvite();
            }
            // check next time
            if (xConf.reject != 0) {
                window.setTimeout(
                    showInvite,
                    xConf.interval * 1000
                );
            }
        };
        var hideInvite = function() {
            //doc.appendChild(nWrap);
            doc.appendChild(nBody);
            setImage(ysf.RESROOT + 'res/nej_blank.gif');
        };
        var showInvite = function() {
            // check service opened
            var delta = (+new Date) - (cache.timestamp || 0);
            if (delta < 5000) {
                // stop if miss open time
                //return;
            }
            // show invite window
            buildInvite();
            //document.body.appendChild(nWrap);
            nBody.style.visibility = 'hidden';
            document.body.appendChild(nBody);
            setImage(xConf.src);
        };
        return function(config) {
            if (!xConf) {
                xConf = config || {};
            }
            // do invite listener
            var doCheck = function() {
                window.setTimeout(
                    showInvite,
                    (xConf.timeout || 0) * 1000
                );
            };
            // check proxy
            if (xConf.ignore || !!cache.timestamp) {
                doCheck();
            } else {
                cache.onackdone = doCheck;
            }
        };
    })()

    /**
     * 浮层样式打开
     *
     * @param {String} url 			    	- 打开URL
     * @param {Object} event 				- 新开窗口参数
     */
    openLayer(function() {
        return function(url, event) {
            var layerNode = document.getElementById('YSF-PANEL-CORPINFO') || document.getElementById('YSF-PANEL-INFO'),
                btnNode = document.getElementById('YSF-BTN-HOLDER');

            if (!layerNode) return;

            // modify btnNode style
            btnNode.style.display = 'none';

            // modify layerNode style
            layerNode.className = 'ysf-chat-layer ysf-chat-layeropen';
            layerNode.setAttribute('data-switch', 1);
            try {
                message.sendChatMsg('status', { layerOpen: 1 });
            } catch (ex) {}
        }
    })()

    /**
     * 新窗口打开
     *
     * @param {String} url 			    	- 打开URL
     * @param {Object} event 				- 新开窗口参数
     */
    openWin(function() {
        return function(url, event) {
            window.open(url, 'YSF_SERVICE_' + (cache.appKey || '').toUpperCase(), event.param);
        }
    })()

    /**
     * 新标签打开
     * @param {String} url 			    	- 打开URL
     * @param {Object} event 				- 新开窗口参数
     */
    openUrl(function() {
        return function(url, event) {
            window.open(url, 'YSF_SERVICE_' + (cache.appKey || '').toUpperCase(), event.param);
        }
    })()

    /**
     * 消息提醒和气泡管理
     *
     * @param {Object} event 				- 事件对象
     * @param {String} event.type       	- 清除消息圈 : clearCircle;
     * @constructor
     */
    NotifyMsgAndBubble(event) {
        var fmap = {
            clearCircle: function(event) {
                var dvc = 'YSF-' + device() + '-MSGNUMBERS',
                    circle = document.getElementById('YSF-BTN-CIRCLE'),
                    bubble = document.getElementById('YSF-BTN-BUBBLE');
                bubble.style.display = 'none';
                circle.style.display = 'none';

                // update MSGNUMBERS data
                localStorage.setItem(dvc, 0);
                cache['notifyNumber'] = 0;
                cache['notifyContent'] = '';
                CircleNumberFlag = 0;
            },

            notifyCircle: function(event) {
                var dvc = 'YSF-' + device() + '-MSGNUMBERS';
                localStorage.setItem(dvc, event.data.circleNum);

                var bubble = document.getElementById('YSF-BTN-BUBBLE'),
                    content = document.getElementById('YSF-BTN-CONTENT'),
                    circle = document.getElementById('YSF-BTN-CIRCLE');

                var layerNode = document.getElementById('YSF-PANEL-CORPINFO') || document.getElementById('YSF-PANEL-INFO');

                var fmap = {
                    image: function(msg) {
                        return '[图片]';
                    },
                    audio: function(msg) {
                        return '[音频]';
                    },
                    text: function(msg) {
                        return msg;
                    }
                };

                // 浮层隐藏的时候 显示消息提醒和气泡
                if (layerNode.getAttribute('data-switch') == 0 && fmap[event.data.type] && cache['sdkCustom'] == 0) {
                    circle.style.display = 'block';
                    bubble.style.display = 'block';
                    circle.innerHTML = event.data.circleNum > 99 ? '99+' : event.data.circleNum;
                    content.innerHTML = fmap[event.data.type](event.data.notifyCnt)
                }
            }
        };

        var func = fmap[event.category];
        if (!!func) func(event);
    }

    /**
     * 获取当前未读消息数接口
     *
     * @return {Object} data				- 返回对象
     * 		   {String} message				- 消息
     * 		   {Number} total				- 消息数
     */
    getUnreadMsg() {
        return {
            type: cache['notifyContent'].type,
            message: cache['notifyContent'].content,
            total: cache['notifyNumber']
        }
    }

    /**
     * 更新配置信息
     *
     * @param  {Object} options         - 配置信息
     * @param  {String} options.appKey  - 当前企业申请到的云信KEY，必须传此参数
     * @param  {String} options.uid     - 企业当前登录用户标识，不传表示匿名用户
     * @param  {String} options.name    - 企业当前登录用户名称
     * @param  {String} options.email   - 企业当前登录用户邮箱
     * @param  {String} options.mobile  - 企业当前登录用户手机号
     * @param  {String} options.profile - 企业当前信息
     * @param  {String} options.avatar  - 用户头像
     * @param  {String} options.data    - 企业当前登录用户其他信息，JSON字符串
     */
    config(options) {
        if (!options) {
            return;
        }
        // merge user information
        util.merge(options);
        // check app key
        if (!!cache.appKey) {
            // check device id
            util.refresh(options.uid);
            // log user visit path
            message.visit();
            // sync crm information to qiyu
            message.syncProfile();

            // init window type config
            util.initWinConfig();

            // MSG Numbers Init


        }
    }

    /**
     * 打开客服聊天窗口
     * @param  {Object} options        		- 配置信息
     * @param  {String} options.appKey 		- 当前企业申请到的云信KEY，必须传此参数
     * @param  {String} options.uid    		- 企业当前登录用户标识，不传表示匿名用户
     * @param  {String} options.name  		- 用户姓名
     * @param  {String} options.email  		- 邮箱地址
     * @return {String}                  	聊天地址
     */
    url() {
        if (!cache.appKey) {
            return '';
        }
        // generator query object
        var opt = {
            k: cache.appKey,
            u: util.device(),
            gid: cache.groupid || 0,
            sid: cache.staffid || 0,
            dvctimer: cache.dvctimer || 0
        };
        // merge user information
        util.each({
            n: 'name',
            e: 'email',
            m: 'mobile'
        }, function(k, v) {
            var it = cache[v];
            if (!!it) {
                opt[k] = it;
            }
        });
        opt.t = encodeURIComponent(document.title);
        // generator chat url
        return ysf.IMROOT + '?' + serialize(opt);
    }

    /**
     * 注销账户接口
     *
     */
    logoff() {
        updateDevice();
        util.clearLocalItems(util.findLocalItems(/msgnumbers/ig));
    }

    /**
     * 通过链接方式打开，必须在A标签上调用，页面代码
     *
     * ```html
     * <a href="#" onclick="ysf.openByLink(event);" target="_ONLINE_SERVICE_">在线客服</a>
     * ```
     *
     * @param  {Event} event - 用户操作事件
     */

    openByLink(event) {
        // generator url
        var url = ysf.url();
        if (!url) {
            return;
        }
        // check link node
        event = event || {};
        var node = event.target || event.srcElement;
        if (!node || node.tagName != 'A') {
            return;
        }
        node.href = url;
    }

    /**
     * 自定义商品信息
     * @param  {Object} config 				- 配置信息
     * @param  {String} config.title      	- 图文混排消息的大标题
     * @param  {String} config.desc     	- 消息描述
     * @param  {String} config.picture   	- 展示在左边的图片url链接
     * @param  {String} config.url  		- 点击图文消息的跳转链接地址
     * @param  {String} config.note 		- 备注
     * @param  {Number} config.hide 		- 是否要在用户端隐藏，0为显示，1为隐藏，默认为显示。
     * @return {Void}
     */
    product(function() {
        var format = function(data) {
            data.title = data.title && data.title.length > 100 ? data.title.slice(0, 100) : data.title;
            data.desc = data.desc && data.desc.length > 300 ? data.desc.slice(0, 300) : data.desc;
            data.note = data.note && data.note.length > 100 ? data.note.slice(0, 100) : data.note;
            return data;
        };

        return function(config) {

            config = format(config);
            syncCustomProfile(config);
        }
    })()

    /**
     * 打开客服聊天窗口
     * 
     * @return {Void}
     */
    open() {
        // generator url
        var url = this.url.apply(
            this, arguments
        );
        if (!url) {
            return;
        }
        var type = this.winParam.type;
        var winParam = this.winParam;
        switch (type) {
            case 'win':
                ysf.openWin(url, winParam);
                break;
            case 'layer':
                ysf.openLayer(url, winParam);
                try {
                    if (firstBtnClick && cache['dvcswitch'] == 0 && cache['pushswitch'] == 0) {
                        sendChatMsg('doconnect', { doconnect: 1 });
                        firstBtnClick = false;
                    }
                } catch (ex) {};

                if (cache['dvcswitch'] == 0 && cache['pushswitch'] == 1 || CircleNumberFlag > 0) {
                    sendChatMsg('dopushmsgread', { ids: msgSessionIds });
                    msgSessionIds = [];
                }
                ysf.NotifyMsgAndBubble({ category: 'clearCircle' });
                break;
            case 'url':
                ysf.openUrl(url, winParam);
                break
        }

    }

    /**
     * 程序开始入口
     * @param {String} sdkURL			- SDK图片地址
     */
    init(sdkURL) {
        var init = function() {
            ysf.entry({
                src: sdkURL
            });

            if (cache['winType'] == 1) {
                ysf.entryPanel(cache['corpInfo']);
            }
        };

        /**
         * 询问服务器配置信息
         *
         * @date: 2016-09-09  下午2:18
         * @param {Number} dvcSwitch          - 会话在线开关 1: 开 0: 关
         * @param {Number} pushSwitch		  - 消息推送开关 1: 开 0: 关
         * @param {Number} batchIdList		  - 要申请的消息Id
         */

        setTimeout(function() {
            util.ajax({
                url: ysf.DOMAIN + 'webapi/user/dvcSession.action?k=' + cache['appKey'] + '&d=' + cache['device'] + '&f=' + cache['uid'],
                success: function(json) {
                    if (json.code == 200) {
                        cache['dvcswitch'] = json.result.dvcSwitch; //|| json.result.dvcSwitch
                        cache['pushswitch'] = json.result.pushSwitch || 0;
                        cache['pushmsgid'] = json.result.batchIdList || 0;
                        init();
                    } else {
                        cache['dvcswitch'] = 0;
                        cache['pushswitch'] = 0;
                        init();
                    }
                },
                error: function() {
                    cache['dvcswitch'] = 0;
                    cache['pushswitch'] = 0;
                    init();
                }
            });
        }, 1000)

    }

    /**
     * 提供外部事件监听方式, 以保证资源加载成功
     *
     * @param {Object} event				- 事件集合
     * @param {String} event.onload			- iframe页面加载成功
     */
    on(function() {
        var fmap = {
            onload: 'load',
            unread: 1
        };

        return function(event) {
            var type = Object.prototype.toString.call(event).slice(8, -1);
            if (/object/ig.test(type)) {
                for (var key in event) {
                    if ('onload' == key && util.isFunction(event[key])) {
                        util.addEvent(proxy, fmap[key], event[key]);
                    } else if (util.isFunction(ysf[key]) && util.isFunction(event[key])) {
                        // 自定义事件
                        ysf['_' + key] = event[key];
                    }
                }
            } else {
                console.warn('波比(｡･∀･)ﾉ: 请保持正确的监听姿势...')
            }
        }
    })()

    /**
     * 拉取推送消息列表
     *
     * @param {Array} ids				- 消息列表
     */
    getPushMessage(ids) {
        sendChatMsg('dogetpushmsg', {
            ids: ids
        });
    }

    /**
     * 获取当前未读消息数接口
     * @return {Object} data			- 返回对象
     * 		   {String} message			- 消息
     * 		   {Number} total			- 消息数
     */
    unread() {
        return {
            type: cache['notifyContent'].type,
            message: cache['notifyContent'].content,
            total: cache['notifyNumber']
        }
    };

}

module.exports = SDK;
