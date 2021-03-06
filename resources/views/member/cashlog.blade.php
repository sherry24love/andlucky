@extends('layout')

@section('style')

@endsection

@section('content')
    <header class="aui-bar aui-bar-nav">
        <a class="aui-pull-left aui-btn" href="{{ route('member.index' ) }}">
            <span class="aui-iconfont aui-icon-left"></span>
        </a>
        <div class="aui-title">我的收入</div>

    </header>
    <section class="aui-content aui-card-list-content aui-margin-b-15">
        <ul class="aui-list aui-media-list aui-list-in" id="withdraw-content">
            @include('member.cashlogitem')
        </ul>
    </section>

@endsection


@section('script')
<script src="{{asset('packages/aui/script/aui-scroll.js')}}"></script>
<script>
    var currentPage = {{ $list->currentpage() }} ;
    var totalPage = {{ $list->lastpage() }} ;
    var loading = false ;
    var scroll = new auiScroll({
        listen:true, //是否监听滚动高度，开启后将实时返回滚动高度
        distance:200 //判断到达底部的距离，isToBottom为true
    },function(ret){
        if( loading ) {
            return false ;
        }
        loading = true
        if( currentPage >= totalPage ) {
            return false ;
        }
        currentPage++ ;
        setTimeout( function(){
            loading = false ;
        } , 3000 );
        $.getJSON( '{{route('member.income')}}' , { page : currentPage } , function( data ){
            loading = false
            if( data.errcode === 0 ) {
                $('#withdraw-content').append( data.html )
            }
        }) ;
    });
</script>
@endsection