/* 口袋48录播下载 */
import React, { Component, createRef } from 'react';
import PropTypes from 'prop-types';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { createSelector, createStructuredSelector } from 'reselect';
import { Link, withRouter } from 'react-router-dom';
import { Button, Table, Affix, message, Input, Tag } from 'antd';
import classNames from 'classnames';
import { playBackList } from '../store/index';
import { downloadList, fnReady } from '../store/reducer';
import style from './style.sass';
import publicStyle from '../../../components/publicStyle/publicStyle.sass';
import post from '../../../components/post/post';
import { time } from '../../../utils';
import { handleChromeDownloadsCreated, handleChromeDownloadsChanged } from '../chromeFunction';
import StreamPath from '../../../components/post/StreamPath';
const url = global.require('url');
const path = global.require('path');

/**
 * 搜索的过滤函数
 * @param { Array } array   : 需要过滤的数组
 * @param { RegExp } keyword: 关键字的正则表达式
 * @param { string } key    : 参考键值
 * @param { number } from   : 查找范围
 * @param { number } to     : 查找范围
 * @return { Array }
 */
function filter(array, keyword, key, from, to) {
  // 如果没有搜索字符串，返回所有数组
  if (!keyword || array.length === 0) {
    return array;
  }
  // 判断当前是否满足搜索匹配
  if (from === to) {
    return keyword.test(array[from][key]) ? [array[from]] : [];
  }
  // 拆分数组
  const middle = Math.floor((to - from) / 2) + from;
  const left = filter(array, keyword, key, from, middle);
  const right = filter(array, keyword, key, middle + 1, to);

  return left.concat(right);
}

/* 初始化数据 */
const getIndex = ($$state) => $$state.has('playBackDownload')
  ? $$state.get('playBackDownload').get('index') : null;
const getState = ($$state) => $$state.has('playBackDownload')
  ? $$state.get('playBackDownload') : null;

const state = createStructuredSelector({
  playBackList: createSelector( // 当前录播
    getIndex,
    ($$data) => $$data !== null && $$data.has('playBackList') ? $$data.get('playBackList').toJS() : []
  ),
  giftUpdTime: createSelector( // 加载时间戳
    getIndex,
    ($$data) => $$data !== null && $$data.has('giftUpdTime') ? $$data.get('giftUpdTime') : 0
  ),
  downloadList: createSelector( // 下载列表
    getState,
    ($$data) => $$data !== null ? $$data.get('downloadList') : new Map()
  ),
  fnReady: createSelector( // 下载事件监听
    getState,
    ($$data) => $$data !== null ? $$data.get('fnReady') : false
  )
});

/* dispatch */
const dispatch = (dispatch) => ({
  action: bindActionCreators({
    playBackList,
    downloadList,
    fnReady
  }, dispatch)
});

@withRouter
@connect(state, dispatch)
class Index extends Component {
  static propTypes = {
    playBackList: PropTypes.array,
    giftUpdTime: PropTypes.number,
    downloadList: PropTypes.object,
    fnReady: PropTypes.bool,
    action: PropTypes.objectOf(PropTypes.func),
    history: PropTypes.object,
    location: PropTypes.object,
    match: PropTypes.object
  };
  playBackDownloadSearchInput = createRef();

  constructor() {
    super(...arguments);

    this.state = {
      loading: false, // 加载动画
      keyword: '', // 搜索关键字
      current: this?.props?.location?.query?.current || 1 // 分页
    };
  }

  // 表格配置
  columus() {
    const columns = [
      {
        title: '直播标题',
        dataIndex: 'title',
        key: 'title',
        width: '20%',
        render: (value, item, index) => {
          const isZhibo = item.liveType === 1;

          return [
            <Tag key="liveType" className={ style.tag } color={ isZhibo ? '#f50' : '#2db7f5' }>
              { isZhibo ? '直播' : '电台' }
            </Tag>,
            value
          ];
        }
      },
      {
        title: '直播地址',
        dataIndex: 'liveId',
        key: 'liveId',
        width: '35%',
        render: (value, item, index) => {
          const isZhibo = item.liveType === 1;

          return <StreamPath key="streamPath" liveId={ value } isZhibo={ isZhibo } />;
        }
      },
      {
        title: '直播人',
        dataIndex: 'userInfo.nickname',
        key: 'userInfo.nickname',
        width: '15%'
      },
      {
        title: '开始时间',
        dataIndex: 'ctime',
        key: 'ctime',
        width: '15%',
        render: (value, item) => time('YY-MM-DD hh:mm:ss', Number(value))
      },
      {
        title: '操作',
        key: 'handle',
        width: '15%',
        render: (value, item, index) => {
          return (
            <Button key="download"
              icon="fork"
              onClick={ this.handleDownloadClick.bind(this, item) }
            >
              下载
            </Button>
          );
        }
      }
    ];

    return columns;
  }

  // 组件挂载之前监听chrome下载事件
  componentDidMount() {
    if (this.props.fnReady === false) {
      chrome.downloads.onCreated.addListener(handleChromeDownloadsCreated);
      chrome.downloads.onChanged.addListener(handleChromeDownloadsChanged);
      // 函数已监听的标识
      this.props.action.fnReady({
        fnReady: true
      });
    }
  }

  // 分页变化
  handlePageChange(page, pageSize) {
    this.setState({
      current: page
    });
  }

  // 下载
  handleDownloadClick(item, event) {
    const urlInfo = url.parse(item.streamPath);
    const pathInfo = path.parse(urlInfo.pathname);

    const title = '【口袋48录播】' + '_' + item.title
                + '_直播时间_' + time('YY-MM-DD-hh-mm-ss', item.startTime)
                + '_下载时间_' + time('YY-MM-DD-hh-mm-ss')
                + '_' + item.liveId;

    chrome.downloads.download({
      url: item.streamPath,
      filename: title + pathInfo.ext,
      conflictAction: 'prompt',
      saveAs: true,
      method: 'GET'
    }, (downloadId) => {
      // 此处需要添加item详细信息
      const obj = this.props.downloadList.get(downloadId);

      obj.item = item;
      // 更新数据
      this.props.downloadList.set(downloadId, obj);
      // 更新store内的数据
      this.props.action.downloadList({
        downloadList: this.props.downloadList
      });
    });
  }

  // 搜索事件（点击按钮 + input回车）
  handleSearchInputClick(event) {
    const { value } = this.playBackDownloadSearchInput.current.input;
    let reg = null;

    if (!/^\s*$/.test(value)) {
      const str = value.split(/\s+/);

      for (let i = str.length - 1; i >= 0; i--) {
        if (str[i] === '') str.splice(i, 1);
      }
      reg = new RegExp(`(${ str.join('|') })`, 'i');
    }

    this.setState({
      keyword: reg
    });
  }

  // 重置
  handleResetClick(event) {
    this.setState({
      keyword: ''
    });
  }

  // 加载和刷新列表
  async handlePlayBackListLoadClick(type, event) {
    this.setState({
      loading: true
    });
    // 判断是加载还是刷新
    let pl = null;
    let giftUpdTime = null;

    switch (type) {
      case '加载':
        pl = this.props.playBackList;
        giftUpdTime = this.props.giftUpdTime;
        break;

      case '刷新':
        pl = [];
        giftUpdTime = 0;
        break;
    }

    // 获取数据
    const data = await post(giftUpdTime);

    console.log(pl, data.content.liveList, data.content.next);

    // 更新列表
    this.props.action.playBackList({
      playBackList: pl.concat(data.content.liveList),
      giftUpdTime: Number(data.content.next)
    });

    this.setState({
      loading: false
    });

    message.success('录播加载成功！');
  }
  render() {
    const { playBackList } = this.props;
    const { loading, keyword } = this.state;

    return [
      /* 功能区 */
      <Affix key="affix" className={ publicStyle.affix }>
        <div className={ classNames(publicStyle.toolsBox, 'clearfix') }>
          <div className={ publicStyle.fl }>
            <label className={ publicStyle.mr10 } htmlFor="playBackDownload-searchInput">搜索已加载列表：</label>
            <Input ref={ this.playBackDownloadSearchInput }
              className={ style.searchInput }
              id="playBackDownload-searchInput"
              placeholder="多个关键字用空格分割"
              onPressEnter={ this.handleSearchInputClick.bind(this) }
            />
            <Button className={ publicStyle.mr10 } icon="search" onClick={ this.handleSearchInputClick.bind(this) }>搜索</Button>
            <Button icon="close" onClick={ this.handleResetClick.bind(this) }>重置</Button>
          </div>
          <div className={ publicStyle.fr }>
            <Button type="primary"
              icon="cloud-download-o"
              onClick={ this.handlePlayBackListLoadClick.bind(this, '加载') }
            >
              加载列表
            </Button>
            <Button className={ publicStyle.ml10 }
              icon="loading-3-quarters"
              onClick={ this.handlePlayBackListLoadClick.bind(this, '刷新') }
            >
              刷新列表
            </Button>
            <Link to="/PlayBackDownload/List">
              <Button className={ publicStyle.ml10 } icon="bars">下载列表</Button>
            </Link>
            <Link className={ publicStyle.ml10 } to="/">
              <Button type="danger" icon="poweroff">返回</Button>
            </Link>
          </div>
        </div>
      </Affix>,
      /* 显示列表 */
      <div key="tableBox" className={ publicStyle.tableBox }>
        <Table loading={ loading }
          bordered={ true }
          columns={ this.columus() }
          rowKey={ (item) => item.liveId }
          dataSource={ filter(playBackList, keyword, 'title', 0, playBackList.length - 1) }
          pagination={{
            pageSize: 20,
            showQuickJumper: true,
            current: this.state.current,
            onChange: this.handlePageChange.bind(this)
          }}
        />
      </div>
    ];
  }
}

export default Index;