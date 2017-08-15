// @flow
/* 视频剪切 */
import React, { Component } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { createSelector, createStructuredSelector } from 'reselect';
import { Link, withRouter } from 'react-router-dom';
import { Button, Table, Icon, Affix, message, Input } from 'antd';
import { time, patchZero } from '../../../function';
import { cutList } from '../store/render';
import formValidation from './formValidation';
import style from './style.sass';
import publicStyle from '../../pubmicMethod/public.sass';
import commonStyle from '../../../common.sass';
const child_process = global.require('child_process');
const path = global.require('path');
const process = global.require('process');
const __dirname = path.dirname(process.execPath).replace(/\\/g, '/');

/* 初始化数据 */
const state: Object = createStructuredSelector({
  cutList: createSelector(         // 剪切队列
    (state: Object): Object | Array=>state.get('cut').get('cutList'),
    (data: Object | Array): Array=>data instanceof Array ? data : data.toJS() // bug
  ),
  cutMap: createSelector(          // 正在剪切
    (state: Object): Map=>state.get('cut').get('cutMap'),
    (data: Map): Map=>data
  )
});

/* dispatch */
const dispatch: Function = (dispatch: Function): Object=>({
  action: bindActionCreators({
    cutList
  }, dispatch)
});

type validChildren = {
  text: string
};

@withRouter
@connect(state, dispatch)
class Cut extends Component{
  dir: string;
  valid: {
    file: validChildren,
    saveFile: validChildren,
    starthh: validChildren,
    startmm: validChildren,
    startss: validChildren,
    endhh: validChildren,
    endmm: validChildren,
    endss: validChildren
  };
  state: {
    file: ?Object,
    saveFile: ?Object,
    starthh: string,
    startmm: string,
    startss: string,
    endhh: string,
    endmm: string,
    endss: string
  };
  constructor(props: ?Object): void{
    super(props);

    this.dir = `${ __dirname }/output`.replace(/\//g, '\\');
    this.valid = {
      file: {
        text: '请选择视频文件！'
      },
      saveFile: {
        text: '请选择文件保存位置！'
      },
      starthh: {
        text: '请输入开始时间！'
      },
      startmm: {
        text: '请输入开始时间！'
      },
      startss: {
        text: '请输入开始时间！'
      },
      endhh: {
        text: '请输入结束时间！'
      },
      endmm: {
        text: '请输入结束时间！'
      },
      endss: {
        text: '请输入结束时间！'
      }
    };
    this.state = {
      file: null,      // 选择文件
      saveFile: null,  // 保存文件
      starthh: '',     // 开始（时）
      startmm: '',     // 开始（分）
      startss: '',     // 开始（秒）
      endhh: '',       // 结束（时）
      endmm: '',       // 结束（分）
      endss: ''        // 结束（秒）
    };
  }
  // 表格配置
  columus(): Array{
    const columus: Array = [
      {
        title: '视频文件地址',
        dataIndex: 'file',
        key: 'file',
        width: '20%',
        render: (text: any, item: Object): string=>item.file.path
      },
      {
        title: '开始时间',
        key: 'startTime',
        width: '20%',
        render: (text: any, item: Object): string=>{
          const { starthh, startmm, startss }: {
            starthh: number,
            startmm: number,
            startss: number
          } = item;
          return `${ patchZero(Number(starthh)) } : ${ patchZero(Number(startmm)) } : ${ patchZero(Number(startss)) }`;
        }
      },
      {
        title: '结束时间',
        key: 'endTime',
        width: '20%',
        render: (text: any, item: Object): string=>{
          const { endhh, endmm, endss }: {
            endhh: number,
            endmm: number,
            endss: number
          } = item;
          return `${ patchZero(Number(endhh)) } : ${ patchZero(Number(endmm)) } : ${ patchZero(Number(endss)) }`;
        }
      },
      {
        title: '文件保存位置',
        dataIndex: 'saveFile',
        key: 'saveFile',
        width: '20%',
        render: (text: any, item: Object): string=>item.saveFile.path
      },
      {
        title: '操作',
        key: 'handle',
        width: '20%',
        render: (text: any, item: Object): Object=>{
          if(this.props.cutMap.has(item.saveFile.path)){
            const m: Map = this.props.cutMap.get(item.id);
            if(m.child.exitCode === null){
              return(
                <div>
                  <b className={ publicStyle.mr10 }>任务结束</b>
                  <Button type="danger" onClick={ this.onDeleteTask.bind(this, item) }>
                    <Icon type="delete" />
                    <span>删除任务</span>
                  </Button>
                </div>
              );
            }else{
              return(
                <Button type="danger">
                  <Icon type="close-circle" />
                  <span>停止任务</span>
                </Button>
              );
            }
          }else{
            return(
              <div>
                <Button className={ publicStyle.mr10 } type="primary">
                  <Icon type="rocket" />
                  <span>开始任务</span>
                </Button>
                <Button type="danger" onClick={ this.onDeleteTask.bind(this, item) }>
                  <Icon type="delete" />
                  <span>删除任务</span>
                </Button>
              </div>
            );
          }
        }
      }
    ];
    return columus;
  }
  componentDidMount(): void{
    // 为input添加nwsaveas属性
    const save: any = document.getElementById('cut-save');
    save.nwsaveas = '';
    save.nwworkingdir = this.dir;
  }
  // 选择文件的change事件
  onFileChange(event: Object): void{
    const save: any = document.getElementById('cut-save');
    const file: ?Object = event.target.files[0] || null;
    const { name, ext }: {
      name: string,
      ext: string
    } = path.parse(file.path);
    const title: string = '【视频剪切】' + name + '_' + time('YY-MM-DD-hh-mm-ss') + ext;
    this.setState({
      file
    });
    save.nwsaveas = file ? title : '';
  }
  // 储存文件的change事件
  onSaveChange(event: Object): void{
    const file: ?Object = event.target.files[0] || null;
    this.setState({
      saveFile: file
    });
  }
  // inputChange
  onInputChange(key: string, event: Object): void{
    this.setState({
      [key]: event.target.value
    });
  }
  // 添加到队列
  onAddQueue(event: Object): void{
    if(formValidation(this.state, this.valid)){
      const cutList: Array = this.props.cutList.slice();
      const { file, saveFile, starthh, startmm, startss, endhh, endmm, endss }: {
        file: ?Object,
        saveFile: ?Object,
        starthh: string,
        startmm: string,
        startss: string,
        endhh: string,
        endmm: string,
        endss: string
      } = this.state;
      cutList.push({
        id: new Date().getDate(),
        file,
        saveFile,
        starthh,
        startmm,
        startss,
        endhh,
        endmm,
        endss
      });
      this.props.action.cutList({
        cutList
      });
      this.setState({
        file: null,      // 选择文件
        saveFile: null,  // 保存文件
        starthh: '',     // 开始（时）
        startmm: '',     // 开始（分）
        startss: '',     // 开始（秒）
        endhh: '',       // 结束（时）
        endmm: '',       // 结束（分）
        endss: ''        // 结束（秒）
      });

      {
        const file: any = document.getElementById('cut-file');
        const save: any = document.getElementById('cut-save');
        file.value = '';
        save.value = '';
        save.nwsaveas = '';
      }
    }
  }
  // 删除任务
  onDeleteTask(item: Object, event: Object): void{
    const index: number = this.props.cutList.indexOf(item);
    this.props.cutList.splice(index, 1);
    this.props.action.cutList({
      cutList: this.props.cutList
    });
  }
  render(): Object{
    const { starthh, startmm, startss, endhh, endmm, endss }: {
      starthh: string,
      startmm: string,
      startss: string,
      endhh: string,
      endmm: string,
      endss: string
    } = this.state;

    return(
      <div>
        <Affix>
          <div className={ `${ publicStyle.toolsBox } ${ commonStyle.clearfix }` }>
            {/* 功能区 */}
            <div className={ publicStyle.fl }>
              <div className={ style.optGroup }>
                <b>文件地址：</b>
                <Button className={ style.fBtn }>
                  <span>选择视频文件</span>
                  <label className={ style.fLabel } htmlFor="cut-file" />
                </Button>
                <span className={ style.path }>{ this.state.file ? this.state.file.path : '' }</span>
                <input className={ style.none }
                       id="cut-file"
                       type="file"
                       onChange={ this.onFileChange.bind(this) } />
              </div>
              <div className={ style.optGroup }>
                <b>开始时间：</b>
                <Input className={ style.input } value={ starthh } onChange={ this.onInputChange.bind(this, 'starthh') } />
                <span className={ style.maohao }>:</span>
                <Input className={ style.input } value={ startmm } onChange={ this.onInputChange.bind(this, 'startmm') } />
                <span className={ style.maohao }>:</span>
                <Input className={ style.input } value={ startss } onChange={ this.onInputChange.bind(this, 'startss') } />
              </div>
              <div className={ style.optGroup }>
                <b>结束时间：</b>
                <Input className={ style.input } value={ endhh } onChange={ this.onInputChange.bind(this, 'endhh') } />
                <span className={ style.maohao }>:</span>
                <Input className={ style.input } value={ endmm } onChange={ this.onInputChange.bind(this, 'endmm') } />
                <span className={ style.maohao }>:</span>
                <Input className={ style.input } value={ endss } onChange={ this.onInputChange.bind(this, 'endss') } />
              </div>
              <div className={ style.optGroup }>
                <b>保存地址：</b>
                <Button className={ style.fBtn }>
                  <span>选择保存位置</span>
                  <label className={ style.fLabel } htmlFor="cut-save" />
                </Button>
                <span className={ style.path }>{ this.state.saveFile ? this.state.saveFile.path : '' }</span>
                <input className={ style.none } id="cut-save" type="file" onChange={ this.onSaveChange.bind(this) } />
              </div>
              <div className={ style.optGroup }>
                <Button type="primary" onClick={ this.onAddQueue.bind(this) }>添加到队列</Button>
              </div>
            </div>
            <div className={ publicStyle.fr }>
              <Link className={ publicStyle.btnLink } to="/">
                <Button className={ publicStyle.ml10 } type="danger">
                  <Icon type="poweroff" />
                  <span>返回</span>
                </Button>
              </Link>
            </div>
          </div>
        </Affix>
        {/* 显示列表 */}
        <div className={ publicStyle.tableBox }>
          <Table loading={ this.state.loading }
                 bordered={ true }
                 columns={ this.columus() }
                 rowKey={ (item: Object): number=>item.id }
                 dataSource={ this.props.cutList }
                 pagination={{
                   pageSize: 20,
                   showQuickJumper: true
                 }} />
        </div>
      </div>
    );
  }
}

export default Cut;